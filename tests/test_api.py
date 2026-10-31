"""Integration tests for RBAC, billing idempotency, discounts, and reporting."""


def test_signup_enforces_password_policy(client):
    resp = client.post(
        "/api/v1/auth/signup",
        json={"email": "weak@x.com", "password": "weak", "full_name": "Weak"},
    )
    assert resp.status_code == 422


def test_signup_unique_email(client):
    body = {"email": "dup@x.com", "password": "Strong@123", "full_name": "Dup"}
    assert client.post("/api/v1/auth/signup", json=body).status_code == 201
    assert client.post("/api/v1/auth/signup", json=body).status_code == 409


def test_customer_cannot_create_product(client, customer_headers):
    resp = client.post(
        "/api/v1/products",
        json={"name": "X", "sales_price": 10},
        headers=customer_headers,
    )
    assert resp.status_code == 403


def test_admin_can_create_product_with_variant(client, admin_headers):
    resp = client.post(
        "/api/v1/products",
        json={
            "name": "Widget",
            "sales_price": 100,
            "variants": [{"name": "Odoo brand", "price_extra": 560}],
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201


def test_only_admin_adds_staff(client, admin_headers, customer_headers):
    body = {"email": "staff@x.com", "password": "Staff@1234", "role": "staff"}
    assert client.post("/api/v1/auth/staff", json=body, headers=customer_headers).status_code == 403
    assert client.post("/api/v1/auth/staff", json=body, headers=admin_headers).status_code == 201


def test_billing_is_idempotent(client, admin_headers):
    # Seeded subscription SUB-000001 (id=1) is confirmed and due.
    first = client.post("/api/v1/subscriptions/1/invoice", headers=admin_headers)
    assert first.status_code == 201, first.text
    # Second call for the same (already billed) period must not duplicate.
    second = client.post("/api/v1/subscriptions/1/invoice", headers=admin_headers)
    assert second.status_code == 409


def test_billing_run_creates_invoices(client, admin_headers):
    resp = client.post("/api/v1/billing/run", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["invoices_created"] >= 1


def test_invoice_total_includes_variant_and_tax(client, admin_headers):
    resp = client.post("/api/v1/subscriptions/1/invoice", headers=admin_headers)
    assert resp.status_code == 201
    # 2 units * (1000 base + 560 variant) = 3120 net, +18% tax = 3681.60
    assert resp.json()["data"]["total"] == 3681.60


def test_payment_marks_invoice_paid(client, admin_headers):
    inv = client.post("/api/v1/subscriptions/1/invoice", headers=admin_headers).json()["data"]
    client.post(f"/api/v1/invoices/{inv['id']}/confirm", headers=admin_headers)
    pay = client.post(
        "/api/v1/payments",
        json={"invoice_id": inv["id"], "method": "card", "amount": inv["total"]},
        headers=admin_headers,
    )
    assert pay.status_code == 201
    assert pay.json()["data"]["status"] == "paid"


def test_reports_summary(client, admin_headers):
    resp = client.get("/api/v1/reports/summary", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "active_subscriptions" in data
    assert "revenue_collected" in data
    assert "overdue_invoices" in data


def test_customer_sees_only_own_subscriptions(client, customer_headers):
    resp = client.get("/api/v1/subscriptions", headers=customer_headers)
    assert resp.status_code == 200
    for s in resp.json()["data"]:
        assert s["customer_id"] == 2  # the seeded customer's id


def test_seeded_discount_auto_applies(client, admin_headers):
    # SUB-000004 (id=4) bills the Priority Support add-on (500) which has a
    # seeded, active 20% product discount. Expect 500 - 20% = 400 net, +18% tax.
    resp = client.post("/api/v1/subscriptions/4/invoice", headers=admin_headers)
    assert resp.status_code == 201, resp.text
    assert resp.json()["data"]["total"] == 472.00


def test_discount_does_not_affect_unrelated_product(client, admin_headers):
    # SUB-000001 uses Brightloop Pro (not the discounted add-on); total unchanged.
    resp = client.post("/api/v1/subscriptions/1/invoice", headers=admin_headers)
    assert resp.status_code == 201, resp.text
    assert resp.json()["data"]["total"] == 3681.60
