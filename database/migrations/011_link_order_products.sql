UPDATE order_items oi
   SET product_id = p.id
  FROM products p
 WHERE oi.product_id IS NULL
   AND p.sku = oi.product_sku;
