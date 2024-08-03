import {useEffect, useState} from 'react';
import {
  reactExtension,
  useApi,
  AdminAction,
  BlockStack,
  Button,
  Text,
  Link,
} from '@shopify/ui-extensions-react/admin';

// The target used here must match the target used in the extension's toml file (./shopify.extension.toml)
const TARGET = 'admin.order-details.action.render';

export default reactExtension(TARGET, () => <App />);

function App() {

  const [message, setMessage] = useState('');
  let orderNumber = "";
  let phoneNumber = "";

  // The useApi hook provides access to several useful APIs like i18n, close, and data.
  const {i18n, close, data} = useApi(TARGET);
  console.log("gid = " + data.selected[0].id);

  // Use direct API calls to fetch data from Shopify.
  // See https://shopify.dev/docs/api/admin-graphql for more information about Shopify's GraphQL API
  useEffect(() => {
    (async function getOrderInfo() {
      const getOrder = {
        query: `query Order($id: ID!) {
          order(id: $id) {
            name
	      customer {
			phone
		}
		displayAddress {
			phone
		}
		billingAddress {
			phone	
		}
		shippingAddress {
			phone	
		}
          }
        }`,
        variables: {id: data.selected[0].id},
      };

      const res = await fetch("shopify:admin/api/graphql.json", {
        method: "POST",
        body: JSON.stringify(getOrder),
      });

      if (!res.ok) {
        console.error('Network error');
      }

	// get order details
	console.log("Getting order data...");
      const orderResult = await res.json();
	console.log(orderResult);

	// set order number
	orderNumber = orderResult.data.order.name;
	
	// set phone number
	if (orderResult.data.order.customer.phone) {
		phoneNumber = orderResult.data.order.customer.phone;
		console.log("Using Phone Number from Contact Information...");
	} else if (orderResult.data.order.displayAddress.phone) {
		phoneNumber = orderResult.data.order.displayAddress.phone;
		console.log("Using Phone Number from Primary Address...");
	} else if (orderResult.data.order.billingAddress.phone) {
		phoneNumber = orderResult.data.order.billingAddress.phone;
		console.log("Using Phone Number from Billing Address...");
	} else if (orderResult.data.order.shippingAddress.phone) {
		phoneNumber = orderResult.data.order.shippingAddress.phone;
		console.log("Using Phone Number from Shipping Address...");
	}

       if (!phoneNumber) {
		console.error('No Phone Number Available.');
	} else {
		// remove whitespaces
		phoneNumber = phoneNumber.trim();

		// remove plus sign
		phoneNumber = phoneNumber.trim("+", 0);
		
		// add country code if missing
		//if (! phoneNumber.startsWith("+65")) {
		//	phoneNumber = "+65" + phoneNumber;
		//}
	}

	let msg = "https://api.whatsapp.com/send/?&type=phone_number&app_absent=0&phone=91089852&text=Hello";// + phoneNumber;
	console.log(msg);
	setMessage(msg);
	
    })();
  }, [data.selected]);
  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <AdminAction
      primaryAction={
	 <Link href={message}>
        <Button
          onPress={() => {
	     console.log("sending WA message...");
            close();
            }}
        >
          Done
        </Button>
	 </Link>
      }
      secondaryAction={
        <Button
          onPress={() => {
            console.log('closing');
            close();
          }}
        >
          Close
        </Button>
      }
    >
      <BlockStack>
        {/* Set the translation values for each supported language in the locales directory */}
        <Text fontWeight="bold">{i18n.translate('welcome', {TARGET})}</Text>
        <Text>Order Number: {orderNumber}</Text>
      </BlockStack>
    </AdminAction>
  );
}