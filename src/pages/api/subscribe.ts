import { NextApiRequest, NextApiResponse } from "next"
import { getSession } from 'next-auth/react'
import { query as q} from 'faunadb'
import { fauna } from "../../services/fauna"
import { stripe } from "../../services/stripe"

type UserProps = {
    ref: {
        id: string
    }
    data: {
        stripe_custumer_id: string
    }
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    if(req.method === 'POST'){
        const sessions = await getSession({ req })

        const user = await fauna.query<UserProps>(
            q.Get(
                q.Match(
                    q.Index('user_by_email'),
                    q.Casefold(sessions.user.email)
                )
            )
        )

        let custumerId = user.data.stripe_custumer_id

        if(!custumerId){
            const stripeCustumer = await stripe.customers.create({
                email: sessions.user.email,
            })

            await fauna.query(
                q.Update(
                   q.Ref(q.Collection('users'), user.ref.id),
                   {
                       data: {
                           stripe_custumer_id: stripeCustumer.id
                       }
                   }
                )
            )

            custumerId = stripeCustumer.id
        }

        const checkoutSession = await stripe.checkout.sessions.create({
            customer: custumerId,
            payment_method_types: ['card'],
            billing_address_collection: 'required',
            line_items: [
                {price: 'price_1KSpYaH2w7tjEQYO9iqYCoFY', quantity: 1 }
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: process.env.STRIPE_SUCCESS_URL,
            cancel_url: process.env.STRIPE_CANCEL_URL,
        })

        return res.status(200).json({ sessionId: checkoutSession.id })
    }else{
        res.setHeader('Allow', 'POST')
        res.status(405).end('Method not allowed')
    }
}