import { Router } from "express";
import companies from "../controllers/companiesController";
import contacts from "../controllers/contactsController";
import products from "../controllers/productsController";

const r = Router();

r.get("/companies", companies.list);
r.post("/companies", companies.create);

r.get("/contacts", contacts.list);
r.post("/contacts", contacts.create);

r.get("/products", products.list);
r.post("/products", products.create);

export default r;
