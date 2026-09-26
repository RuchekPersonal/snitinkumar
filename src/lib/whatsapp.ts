import { site } from "./site";

export function waLink(text: string, number: string = site.whatsappNumber): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export const generalEnquiryText = `Hello ${site.name}, I want to know more about your wholesale kurti catalogue.`;

export const catalogueRequestText = `Hello ${site.name}, please share the full catalogue PDF with rates.\nShop name: \nCity: `;

export function productEnquiryText(code: string, name: string, url: string): string {
  return `Hello ${site.name}, I'm interested in ${code} – ${name}.\n${url}\nPlease share rate and availability.`;
}
