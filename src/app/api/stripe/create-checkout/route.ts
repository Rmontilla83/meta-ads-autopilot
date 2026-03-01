import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { STRIPE_PRICE_MAP } from '@/lib/plans';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { planKey, interval } = await request.json() as {
      planKey: string;
      interval: 'monthly' | 'annual';
    };

    if (!planKey || !interval) {
      return NextResponse.json({ error: 'Plan e intervalo requeridos' }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_MAP[`${planKey}_${interval}`];
    if (!priceId) {
      return NextResponse.json({ error: 'Plan no válido' }, { status: 400 });
    }

    // Get or create Stripe Customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email,
        name: profile?.full_name || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      // Store customer ID
      const admin = createAdminClient();
      await admin.from('profiles').update({
        stripe_customer_id: customerId,
      }).eq('id', user.id);
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || '';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings/billing?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan: planKey,
        interval,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Create checkout error:', error);
    const message = error instanceof Error ? error.message : 'Error al crear sesión de pago';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
