import { CustomersApi, Configuration, Customer, CustomerResponse } from "conekta";
var conekta = require('conekta');
conekta.api_key = 'key_pt4c0MM2XKF8HXGytMz2OFJ';
conekta.api_version = '2.0.0';


const apikey = "key_xxxxx";
const config = new Configuration({ accessToken: apikey });
const client = new CustomersApi(config);

const customer: Customer = {
  name: "John Constantine",
  email: "frank@google.com",
  phone: "+5215555555555"
}

client.createCustomer(customer).then(response => {
  const customerResponse = response.data as CustomerResponse;
  console.log(customerResponse.id);
}).catch(error => {
  console.error("here", error);
});