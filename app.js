const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const STORE_DOMAIN = process.env.STORE_DOMAIN;
const STORE_FRONT_TOKEN = process.env.STORE_FRONT_TOKEN;
const args = Array.from(process.argv).slice(2);

let productName = "";
let useStoreFrontToken = false; // default to use admin token
let query = null;
let response = null;
let products = null;
let results = null;


async function getData(productName) {
  if (useStoreFrontToken) {
    try {
      // using store front token to get the product details
       query = `query predictiveSearch($query: String!) {
        predictiveSearch(query: $query, limit: 10) {
          products {
            id
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price {
                    amount
                  }
                }
              }
            }
          }
        }
      }
      `;
      response = await axios.post(
        `https://${STORE_DOMAIN}/api/2024-07/graphql.json`,
        {
          query: query,
          variables: {
            query: `title:${productName.trim()}`,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": STORE_FRONT_TOKEN,
          },
        }
      );
  
      products = response.data.data.predictiveSearch.products;
  
      results = await Promise.all(
        products.map((product) => {
          return product.variants.edges.map((variant) => {
            // console.log("variant", variant);
            return {
              product_name: product.title,
              variant_name: variant.node.title,
              price: parseFloat(variant.node.price.amount),
            };
          });
        })
      );
      // console.log("REsults : ", results);
      results
      .flat()
      .sort((a, b) => a.price - b.price)
      .forEach((item) => {
        console.log(
          `${item.product_name} - ${item.variant_name} - price $${item.price}`
        );
      });
    } catch (error) {
      console.log("Error :", error);
    }
  } else {
    // using admin token to get the product details
    try {
        query = `
          query Products($query: String!) {
              products(first:10,query: $query) {
                  edges {
                      node {
                          title
                          variants(first:10) {
                              edges {
                                  node {
                                      title
                                      price
                                  }
                              }
                          }
                      }
                  }
              }
          }
      `;
       response = await axios.post(
        `https://${STORE_DOMAIN}/admin/api/2024-07/graphql.json`,
        {
          query: query,
          variables: {
            query: `title:${productName.trim()}`,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": ADMIN_TOKEN,
          },
        }
      );
  
      // console.log("response", response.data);
      products = response.data.data.products.edges;
  
      results = await Promise.all(
        products.map((product) => {
          return product.node.variants.edges.map((variant) => {
            return {
              product_name: product.node.title,
              variant_name: variant.node.title,
              price: parseFloat(variant.node.price),
            };
          });
        })
      );
      // console.log("REsults : ", results);
      results
      .flat()
      .sort((a, b) => a.price - b.price)
      .forEach((item) => {
        console.log(
          `${item.product_name} - ${item.variant_name} - price $${item.price}`
        );
      });
    } catch (error) {
      console.log("Error fetching products:", error);
    }
  }

}

// getting a product name

for (let i = 0; i < args.length; i++) {
  if (!(args[i].startsWith("-")) ) {
    productName += args[i] + " ";
  }
}

getData(productName);
