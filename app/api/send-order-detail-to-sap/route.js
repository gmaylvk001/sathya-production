import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EcomOrderInfo from "@/models/ecom_order_info";
import ecom_address_info from "@/models/ecom_user_address_info";
import ecom_payment_info from "@/models/ecom_payment_info";
import mongoose from 'mongoose';

export async function POST(req) {
    
    const body = await req.json();
    
    const order_number = body.order_number;

    const formatState = (state) => {
  if (!state) return "";

  const states = {
    Tamilnadu: "Tamil Nadu",
    TamilNadu: "Tamil Nadu",
    Karnataka: "Karnataka",
    Kerala: "Kerala",
  };

  return states[state] || state;
};
    
    
    const order_new_vk = await EcomOrderInfo.findOne({ order_number }).lean();
    
    if (order_new_vk?.createdAt) {
      const date = new Date(order_new_vk.createdAt);

      /*
      const istDate = date.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      */
      const d = new Date(date);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");

      order_new_vk.created_at_formatted = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`; 
    }
    
    const userId = order_new_vk.user_id;
    
      
    
    
    const address_new_vk = await ecom_address_info.findOne({ userId }).lean();
    
    const payment_id = order_new_vk.payment_id;
    
    const payment_details = await ecom_payment_info.findOne({ payment_id }).lean();
    
    //return NextResponse.json({ address_new_vk }).lean();
    
    let payment_ref = "";
    //if (payment_details.payment_mode != "cash") {
    if (payment_details.payment_mode != "Cash on Delivery") {
        payment_ref = payment_details.payment_id;
    }
  

   
    
  
  
  
  /*
  const items = order_new_vk.order_details.map(item => ({
  SKU: item.item_code || "",
  Product: item.product_name || "",
  Quantity: item.quantity || 0,
  Price: item.product_price || 0,
  Discount: item.coupondiscount || 0
}));

*/

const items = order_new_vk.order_details.map(item => ({
  SKU: item.item_code?.startsWith('ITEM')
    ? item.item_code.replace(/^ITEM/, '')
    : item.item_code || "",

  Product: item.product_name || "",
  Quantity: item.quantity || 0,
  Price: item.product_price || 0,
  Discount: item.coupondiscount || 0
}));


 

  // Dates
  const DocDate = order_new_vk.created_at_formatted;
  const DocDueDate = order_new_vk.created_at_formatted;

  const fullAddress = address_new_vk.landmark
  ? `${address_new_vk.address}, ${address_new_vk.landmark}`
  : address_new_vk.address;

  // API Payload (Converted)
  const data = {
    data: {
      DocDate,
      DocDueDate,
      CardCode: 36,
      FirstName: address_new_vk.firstName,
      LastName: address_new_vk.lastName,
      WebRefNo: order_new_vk.order_number,
      mage_orderid: 82,
      PhoneNumber: address_new_vk.phonenumber,
      Email: address_new_vk.email,
      DocumentLines: items,
      FreightCode: "Free Shipping - Free",
      FreightCharges: 0,
      PaymentRef: payment_ref,
      ShipToStreetAddress: fullAddress,
      ShipToZipCode: address_new_vk.postCode,
      ShipToCity: address_new_vk.city,
      ShipToState: formatState(address_new_vk.state),
      BillToStreetAddress: fullAddress,
      BillToZipCode: address_new_vk.postCode,
      BillToCity: address_new_vk.city,
      BillToState: formatState(address_new_vk.state),
    },
  };
  

  //return NextResponse.json({ data });
  
    

  // API URL
  
 const url =
    "http://vzone.in:628/B1iXcellerator/exec/ipo/.DEV.sap.httpcallpost.sap.httpcallpost/com.sap.b1i.dev.scenarios.setup/sap.httpcallpost/sap.httpcallpost.ipo/httpcallpost.sap.httpcallpost";
    
   
   /*
    
    const url =
    "http://Sathya Stores-SAP-CLIENT.Victory.local:8080/B1iXcellerator/exec/ipo/.DEV.sap.httpcallpost.sap.httpcallpost/com.sap.b1i.dev.scenarios.setup/sap.httpcallpost/sap.httpcallpost.ipo/httpcallpost.sap.httpcallpost";
    
    */
    

  try {
    // External API POST call
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.text(); // (SAP may return XML or string)

    return NextResponse.json({
      status: "success",
      sentData: data,
      externalResponse: result,
      mystatus: "successfully_send_to_sap",
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: error.message , mystatus: "failed_send_to_sap"},
      { status: 500 }
    );
  }
}
