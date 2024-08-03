import {useEffect, useState} from 'react';
import {
  reactExtension,
  useApi,
  useNavigate,
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

  const [warequest, setWARequest] = useState('');
  const [adminMessage, setAdminMessage] = useState("Loading...");

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
            lineItems(first:20) {
            	nodes {
            		name
            	}
            }
            requiresShipping
            fullyPaid
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
			      	name
			      	company
			      	address1
			      	address2
			      	country
			      	zip
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
			console.log("Getting order details...");
      const orderDetails = await res.json();
			console.log(orderDetails);

			// get order number, (order number is non-null)
			let orderNumber = orderDetails.data.order.name;
	
			// get phone number
  		let phoneNumber = "";
			if (orderDetails.data.order.customer.phone) {
				phoneNumber = orderDetails.data.order.customer.phone;
				console.log("Using Phone Number from Contact Information: " + phoneNumber);
			} else if (orderDetails.data.order.displayAddress.phone) {
				phoneNumber = orderDetails.data.order.displayAddress.phone;
				console.log("Using Phone Number from Primary Address:" + phoneNumber);
			} else if (orderDetails.data.order.billingAddress.phone) {
				phoneNumber = orderDetails.data.order.billingAddress.phone;
				console.log("Using Phone Number from Billing Address:" + phoneNumber);
			} else if (orderDetails.data.order.shippingAddress.phone) {
				phoneNumber = orderDetails.data.order.shippingAddress.phone;
				console.log("Using Phone Number from Shipping Address:" + phoneNumber);
			}
			// clean up phone number
			if (!phoneNumber) {
				console.error('No Phone Number Available.');
			} else {
				// remove whitespaces
				phoneNumber = phoneNumber.trim();

				// remove plus sign
				phoneNumber = phoneNumber.trim("+", 0);
			}

			// check if order requires shipping
			let requiresShipping = orderDetails.data.order.requiresShipping;
			console.log("Order requires shipping? " + requiresShipping);

			// check if order is fully paid
			let isFullyPaid = orderDetails.data.order.fullyPaid;
			console.log("Order fully paid? " + isFullyPaid);

			/* START - construct WhatsApp Message to send */
			let message = "Hi from Ani Mecha here, we have an update for your order "+ orderNumber + ":\n";
			// add product names
			if (orderDetails.data.order.lineItems && orderDetails.data.order.lineItems.nodes) {
				let products = orderDetails.data.order.lineItems.nodes;
				for (product of products) {
					if (product.name) {
						if (product.name.startsWith("Prepaid")) {
							continue;
						}
						message += "- " + product.name + "\n";
					}
				}
			} else {
				console.error("No products found!");
			}
			message += "\n";
			// add pick up or delivery message
			if (!requiresShipping) {
				message += "The above items are ready for collection, appreciate it if you can collect within 2 weeks' time.";
			} else {
				if (isFullyPaid) {
					message += "The above items are ready for delivery.";
				} else {
					message += "The above items are ready for delivery, and we have sent you an invoice.";
				}
				message += "\n\n";
				message += "Just to confirm, is the following delivery address correct?\n\n";

				// add address
				let address = orderDetails.data.order.shippingAddress;
				if (address) {
					if (address.name) message += address.name + "\n";
					if (address.company) message += address.company + "\n";
					if (address.address1) message += address.address1 + "\n";
					if (address.address2) message += address.address2 + "\n";
					if (address.country && address.zip) message += address.country + " " + address.zip;
				}
			}
			console.log("WhatsApp Message to send:\n" + message);
			setAdminMessage(message);

			// construct whatsapp request
			let warequest = "https://api.whatsapp.com/send/?&type=phone_number&app_absent=0";
			warequest += "&phone=" + phoneNumber;
			warequest += "&text=" + encodeURIComponent(message);
			console.log(warequest);
			setWARequest(warequest);
    })();
  }, [data.selected]);
  return (
    // The AdminAction component provides an API for setting the title and actions of the Action extension wrapper.
    <AdminAction
      primaryAction={
	        <Button href={warequest}
	          onPress={() => {
	            close();
	          }}
	        >Send WhatsApp Message
	        </Button>
      }
    >
      <BlockStack>
        {/* Set the translation values for each supported language in the locales directory */}
        <Text>{adminMessage}</Text>
      </BlockStack>
    </AdminAction>
  );
}