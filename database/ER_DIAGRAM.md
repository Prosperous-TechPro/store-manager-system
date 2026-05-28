ER Diagram (text):

Users (1) --- (M) Sales
Products (1) --- (M) Sale_items
Sales (1) --- (M) Sale_items
Products (1) --- (M) Stock_movements
Products (1) --- (M) Missing_products
Products holds supplier_id -> Suppliers (1) --- (M) Products

Use a visual tool (draw.io or dbdiagram.io) to render this ER diagram.
