import { query as q} from 'faunadb';
import { fauna } from "../../../services/fauna";
import { stripe } from '../../../services/stripe';


export async function saveSubscription(
    subscriptionId: string,
    custumerId: string,
    createdAction: boolean = false,
){
    // Buscar o usuário  no FaunaDb com o custumerId {}
    const userRef = await fauna.query(
        q.Select(
            'ref',
            q.Get(
                q.Match(
                    q.Index('user_by_stripe_customer_id'),
                    custumerId
                )
            )
        )
    )

    //Salvar os dados da subscription do usuário no FaunaDB
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    const subscriptionData =    {
        id: subscription.id,
        userId: userRef,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
    }

    console.log('BATATA')
    console.log(subscriptionData)

    if(createdAction){
        await fauna.query(
            q.Create(
                'subscriptions',
                { data: subscriptionData }
            )
        )
    } else {
        await fauna.query(
            q.Replace(
                q.Select(
                    'ref',
                    q.Get(
                        q.Match(
                            q.Index('subscription_by_id'),
                            subscriptionId
                        )
                    )
                ),
                { data: subscriptionData }
            )
        )
    }
}