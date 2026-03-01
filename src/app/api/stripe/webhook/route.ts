import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlanByStripePrice } from '@/lib/plans';
import { createNotification } from '@/lib/notifications';
import type Stripe from 'stripe';

// Helper to extract subscription data regardless of SDK version
function getSubData(sub: Stripe.Subscription | Stripe.Response<Stripe.Subscription>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = sub as any;
  return {
    id: s.id as string,
    items: s.items as Stripe.Subscription['items'],
    current_period_start: s.current_period_start as number,
    current_period_end: s.current_period_end as number,
    cancel_at_period_end: s.cancel_at_period_end as boolean,
    status: s.status as Stripe.Subscription.Status,
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;

        if (!userId || !subscriptionId) break;

        const rawSub = await stripe.subscriptions.retrieve(subscriptionId);
        const subscription = getSubData(rawSub);
        const priceId = subscription.items.data[0]?.price.id;
        const planInfo = getPlanByStripePrice(priceId);

        if (!planInfo) break;

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: priceId,
          plan: planInfo.plan,
          status: 'active',
          billing_interval: planInfo.interval as 'monthly' | 'annual',
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: 'user_id' });

        await supabase.from('profiles').update({
          plan: planInfo.plan,
          stripe_customer_id: session.customer as string,
        }).eq('id', userId);

        await createNotification({
          user_id: userId,
          type: 'system',
          title: 'Suscripción activada',
          message: `Tu plan ${planInfo.plan === 'growth' ? 'Growth' : planInfo.plan === 'starter' ? 'Starter' : 'Agencia'} está activo.`,
          metadata: { plan: planInfo.plan, interval: planInfo.interval },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const rawSub = event.data.object as Stripe.Subscription;
        const subscription = getSubData(rawSub);
        const priceId = subscription.items.data[0]?.price.id;
        const planInfo = getPlanByStripePrice(priceId);

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!sub) break;

        const status = subscription.status === 'active' ? 'active'
          : subscription.status === 'past_due' ? 'past_due'
          : subscription.status === 'canceled' ? 'canceled'
          : subscription.status === 'trialing' ? 'trialing'
          : subscription.status === 'incomplete' ? 'incomplete'
          : 'unpaid';

        await supabase.from('subscriptions').update({
          stripe_price_id: priceId,
          plan: planInfo?.plan ?? 'free',
          status,
          billing_interval: planInfo?.interval as 'monthly' | 'annual' | undefined,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        }).eq('stripe_subscription_id', subscription.id);

        if (status === 'active' && planInfo) {
          await supabase.from('profiles').update({ plan: planInfo.plan }).eq('id', sub.user_id);
        }

        if (subscription.cancel_at_period_end) {
          await createNotification({
            user_id: sub.user_id,
            type: 'system',
            title: 'Suscripción cancelada',
            message: `Tu suscripción se cancelará al final del período actual.`,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const rawSub = event.data.object as Stripe.Subscription;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', rawSub.id)
          .single();

        if (!sub) break;

        await supabase.from('subscriptions').update({
          status: 'canceled',
          cancel_at_period_end: false,
        }).eq('stripe_subscription_id', rawSub.id);

        await supabase.from('profiles').update({ plan: 'free' }).eq('id', sub.user_id);

        await createNotification({
          user_id: sub.user_id,
          type: 'system',
          title: 'Plan cambiado a Gratis',
          message: 'Tu suscripción ha finalizado. Ahora estás en el plan Gratis.',
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!sub) break;

        await supabase.from('subscriptions').update({
          status: 'past_due',
        }).eq('stripe_customer_id', customerId);

        await createNotification({
          user_id: sub.user_id,
          type: 'system',
          title: 'Error en el pago',
          message: 'No pudimos procesar tu pago. Por favor actualiza tu método de pago.',
        });
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (sub) {
          await supabase.from('subscriptions').update({
            status: 'active',
          }).eq('stripe_customer_id', customerId);
        }
        break;
      }
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
