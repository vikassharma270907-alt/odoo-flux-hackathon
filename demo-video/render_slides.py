import os
import subprocess

SLIDES_DATA = [
    {
        "id": "scene_01",
        "eyebrow": "ODDOO x FLUX LUCKNOW HACKATHON '26",
        "title": "Brightloop",
        "subtitle": "Unified Subscription Management System",
        "lead": "A full-lifecycle subscription & billing platform: products & variants, quotation-to-subscription, automated idempotent recurring invoicing, smart discounts, payments, and an executive finance dashboard.",
        "badges": ["Node 20", "Express 4", "PostgreSQL 16", "Zod", "JWT", "React 18", "Vite", "Tailwind CSS", "Recharts"],
        "content_html": """
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 36px;">
            <div style="background: #fff; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="font-size: 28px; margin-bottom: 8px;">🔁</div>
                <div style="font-size: 18px; font-weight: 700; color: #1e293b;">Automated Recurring Billing</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px; line-height: 1.5;">Idempotent billing engine with unique constraints and row locks. Never bills twice or skips periods.</div>
            </div>
            <div style="background: #fff; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="font-size: 28px; margin-bottom: 8px;">🏷️</div>
                <div style="font-size: 18px; font-weight: 700; color: #1e293b;">Dynamic Catalogue & Pricing</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px; line-height: 1.5;">Flexible plans (daily, weekly, monthly, yearly), product variants (+₹560 surcharge), and automatic discounts.</div>
            </div>
            <div style="background: #fff; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="font-size: 28px; margin-bottom: 8px;">📊</div>
                <div style="font-size: 18px; font-weight: 700; color: #1e293b;">Finance Dashboard & Scale</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px; line-height: 1.5;">Real-time MRR, revenue charts, and overdue aging powered by PostgreSQL views across 5,000+ subscriptions.</div>
            </div>
        </div>
        """
    },
    {
        "id": "scene_02",
        "eyebrow": "THE CORE PROBLEM",
        "title": "Subscriptions Are Deceptively Hard",
        "subtitle": "Real-world subscription billing fails without database-level guarantees",
        "lead": "Billing every customer for every period sounds trivial until you face duplicate charges, concurrency race conditions, skipped intervals, complex tax jurisdictions, and uncoordinated state transitions.",
        "badges": ["Idempotency", "Concurrency Control", "Fiscal Precision", "State Integrity"],
        "content_html": """
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 30px;">
            <div style="background: #fff5f5; border: 1px solid #fecaca; border-radius: 16px; padding: 24px;">
                <div style="font-size: 18px; font-weight: 800; color: #b91c1c; margin-bottom: 14px;">❌ Common Industry Failures</div>
                <ul style="list-style: none; font-size: 15px; color: #475569; line-height: 2;">
                    <li>⚠️ <b>Duplicate billing:</b> Retrying failed jobs charges customers multiple times.</li>
                    <li>⚠️ <b>Silent period skipping:</b> Missed cron runs leave unbilled active intervals.</li>
                    <li>⚠️ <b>Race conditions:</b> Parallel webhook calls corrupt invoice states.</li>
                    <li>⚠️ <b>Desynchronized finance:</b> Reporting disagrees with actual bank settlements.</li>
                </ul>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 24px;">
                <div style="font-size: 18px; font-weight: 800; color: #15803d; margin-bottom: 14px;">✅ Brightloop Relational Solution</div>
                <ul style="list-style: none; font-size: 15px; color: #1e293b; line-height: 2;">
                    <li>🔒 <b>Atomic Idempotency:</b> UNIQUE constraints + ON CONFLICT DO NOTHING.</li>
                    <li>🔒 <b>Strict Lifecycle:</b> Hardened state machine with 409 Conflict rejection.</li>
                    <li>🔒 <b>Row-Level Locks:</b> SELECT FOR UPDATE prevents simultaneous runs.</li>
                    <li>🔒 <b>Verified Truth:</b> PostgreSQL views compute MRR directly from payments.</li>
                </ul>
            </div>
        </div>
        """
    },
    {
        "id": "scene_03",
        "eyebrow": "SYSTEM ARCHITECTURE",
        "title": "Clean 3-Tier Decoupled Design",
        "subtitle": "Thin Routes · Transactional Services · Pure Domain Rules · Relational DB",
        "lead": "No static JSON, no vendor lock-in. Built from first principles on Node 20, Express 4, and PostgreSQL 16.",
        "badges": ["3-Tier Architecture", "Clean Architecture", "JWT Auth", "Zod Validation", "Pure Domain Logic"],
        "content_html": """
        <div style="display:flex; align-items:stretch; gap: 18px; margin-top: 32px;">
            <div style="flex:1; background: #fff; border: 2px solid #e2e8f0; border-radius: 16px; padding: 22px; text-align: center;">
                <div style="font-size: 20px; font-weight: 800; color: #714B67;">1. Client Tier (SPA)</div>
                <div style="font-size: 14px; font-weight: 600; color: #017E84; margin-top: 4px;">React 18 + Vite + Tailwind</div>
                <p style="font-size: 13px; color: #64748b; margin-top: 12px; line-height: 1.6;">Calls REST API with Bearer JWT tokens in headers. Responsive UI, Recharts analytics, offline resilience.</p>
            </div>
            <div style="display:grid; place-items:center; font-size: 28px; color: #94a3b8;">➔</div>
            <div style="flex:1.4; background: #fff; border: 2px solid #714B67; border-radius: 16px; padding: 22px; text-align: center; box-shadow: 0 10px 25px rgba(113,75,103,0.12);">
                <div style="font-size: 20px; font-weight: 800; color: #714B67;">2. API & Logic Tier</div>
                <div style="font-size: 14px; font-weight: 600; color: #017E84; margin-top: 4px;">Express 4 Pipeline</div>
                <div style="background: #f8fafc; border-radius: 8px; padding: 10px; margin-top: 10px; font-size: 12px; font-family: monospace; text-align: left; line-height: 1.6;">
                    authenticate ➔ requireRole ➔ Zod validate<br/>
                    ➔ thin route ➔ transactional service ➔ pure domain maths
                </div>
            </div>
            <div style="display:grid; place-items:center; font-size: 28px; color: #94a3b8;">➔</div>
            <div style="flex:1; background: #fff; border: 2px solid #017E84; border-radius: 16px; padding: 22px; text-align: center;">
                <div style="font-size: 20px; font-weight: 800; color: #017E84;">3. Database Tier</div>
                <div style="font-size: 14px; font-weight: 600; color: #714B67; margin-top: 4px;">PostgreSQL 16</div>
                <p style="font-size: 13px; color: #64748b; margin-top: 12px; line-height: 1.6;">Parameterised SQL, row locks, foreign keys, and SQL views (v_dashboard_summary, v_mrr, v_overdue_invoices).</p>
            </div>
        </div>
        """
    },
    {
        "id": "scene_04",
        "eyebrow": "CATALOGUE & CONFIGURATION",
        "title": "Products, Variants & Smart Discounts",
        "subtitle": "Admin controls catalogue with dynamic variant surcharge & automated discounts",
        "lead": "Demonstrating the Odoo variant (+₹560) and conditional discounts that automatically apply on future billing cycles.",
        "badges": ["Product Variants", "Billing Plans", "Per-Plan Flags", "Automated Discounts"],
        "content_html": """
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-top: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #64748b;">
                    <th style="padding: 10px 14px;">Product / Service</th>
                    <th style="padding: 10px 14px;">Variant / Surcharge</th>
                    <th style="padding: 10px 14px;">Base Price</th>
                    <th style="padding: 10px 14px;">Final Price</th>
                    <th style="padding: 10px 14px;">Billing Rule</th>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 14px; font-weight: 700;">Enterprise ERP Suite</td>
                    <td style="padding: 12px 14px;"><span style="background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 12px;">Brand = Odoo (+₹560)</span></td>
                    <td style="padding: 12px 14px; color: #64748b;">₹2,000</td>
                    <td style="padding: 12px 14px; font-weight: 800; color: #714B67; font-size: 16px;">₹2,560</td>
                    <td style="padding: 12px 14px; color: #059669; font-weight: 600;">Monthly Recurring</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 14px; font-weight: 700;">Standard Cloud Instance</td>
                    <td style="padding: 12px 14px; color: #94a3b8;">Standard Default</td>
                    <td style="padding: 12px 14px; color: #64748b;">₹999</td>
                    <td style="padding: 12px 14px; font-weight: 800; color: #1e293b; font-size: 16px;">₹999</td>
                    <td style="padding: 12px 14px; color: #059669; font-weight: 600;">Monthly Recurring</td>
                </tr>
                <tr>
                    <td style="padding: 12px 14px; font-weight: 700;">Volume Discount (5+ seats)</td>
                    <td style="padding: 12px 14px;"><span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 12px;">10% Off · Auto-Applies</span></td>
                    <td style="padding: 12px 14px; color: #64748b;">—</td>
                    <td style="padding: 12px 14px; font-weight: 700; color: #15803d;">Applied on Invoice</td>
                    <td style="padding: 12px 14px; color: #64748b;">Expires when quota reached</td>
                </tr>
            </table>
        </div>
        """
    },
    {
        "id": "scene_05",
        "eyebrow": "SUBSCRIPTION STATE MACHINE",
        "title": "Quotation to Subscription Lifecycle",
        "subtitle": "Server-Enforced State Transitions: Draft ➔ Quotation ➔ Confirmed ➔ Active",
        "lead": "Subscriptions are initialized from Quotation Templates with live price snapshots. Illegal state hops are rejected with HTTP 409 Conflict.",
        "badges": ["Quotation Templates", "Server State Machine", "Price Snapshots", "Conflict 409 Guard"],
        "content_html": """
        <div style="margin-top: 36px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap: 8px;">
                <div style="background: #fff; border: 2px solid #714B67; border-radius: 12px; padding: 18px 26px; text-align: center; box-shadow: 0 4px 12px rgba(113,75,103,0.15);">
                    <div style="font-size: 12px; color: #64748b; font-weight: 700;">STEP 1</div>
                    <div style="font-size: 20px; font-weight: 800; color: #714B67;">Draft</div>
                </div>
                <div style="height: 4px; flex: 1; background: #714B67; position: relative;"></div>
                <div style="background: #fff; border: 2px solid #714B67; border-radius: 12px; padding: 18px 26px; text-align: center; box-shadow: 0 4px 12px rgba(113,75,103,0.15);">
                    <div style="font-size: 12px; color: #64748b; font-weight: 700;">STEP 2</div>
                    <div style="font-size: 20px; font-weight: 800; color: #714B67;">Quotation</div>
                </div>
                <div style="height: 4px; flex: 1; background: #714B67; position: relative;"></div>
                <div style="background: #fff; border: 2px solid #714B67; border-radius: 12px; padding: 18px 26px; text-align: center; box-shadow: 0 4px 12px rgba(113,75,103,0.15);">
                    <div style="font-size: 12px; color: #64748b; font-weight: 700;">STEP 3</div>
                    <div style="font-size: 20px; font-weight: 800; color: #714B67;">Confirmed</div>
                </div>
                <div style="height: 4px; flex: 1; background: #059669; position: relative;"></div>
                <div style="background: #dcfce7; border: 2px solid #059669; border-radius: 12px; padding: 18px 26px; text-align: center; box-shadow: 0 6px 18px rgba(5,150,105,0.2);">
                    <div style="font-size: 12px; color: #047857; font-weight: 700;">RUNNING</div>
                    <div style="font-size: 20px; font-weight: 800; color: #047857;">Active</div>
                </div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-top: 30px; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 14px; color: #475569;">
                    <b>State Security Guarantee:</b> The UI only exposes permitted transitions. An invalid API call returns <code>HTTP 409 Conflict</code>.
                </div>
                <div style="background: #fee2e2; color: #b91c1c; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 999px;">
                    Illegal Transitions Forbidden
                </div>
            </div>
        </div>
        """
    },
    {
        "id": "scene_06",
        "eyebrow": "SIGNATURE ARCHITECTURE MOMENT",
        "title": "Idempotent Recurring Billing",
        "subtitle": "Nothing is billed twice. Ever. Proven by PostgreSQL constraints.",
        "lead": "Testing the billing engine: Run 1 creates 429 invoices; Run 2 creates 0 invoices and skips 429 periods.",
        "badges": ["Idempotent Billing", "PostgreSQL Unique Constraint", "FOR UPDATE Row Lock", "Catch-up Logic"],
        "content_html": """
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 26px;">
            <div style="background: #fff; border: 2px solid #10b981; border-radius: 16px; padding: 24px; box-shadow: 0 6px 20px rgba(16,185,129,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size: 14px; font-weight: 700; color: #047857;">FIRST BILLING RUN</div>
                    <span style="background: #dcfce7; color: #047857; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800;">Processed</span>
                </div>
                <div style="font-size: 64px; font-weight: 900; color: #059669; margin: 12px 0 6px 0;">429</div>
                <div style="font-size: 15px; font-weight: 600; color: #1e293b;">Invoices Created Successfully</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 6px;">Taxes and armed discounts calculated and snapshotted per invoice.</div>
            </div>
            <div style="background: #fff; border: 2px solid #f59e0b; border-radius: 16px; padding: 24px; box-shadow: 0 6px 20px rgba(245,158,11,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size: 14px; font-weight: 700; color: #b45309;">SECOND BILLING RUN (IMMEDIATE)</div>
                    <span style="background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800;">Idempotent</span>
                </div>
                <div style="font-size: 64px; font-weight: 900; color: #d97706; margin: 12px 0 6px 0;">0</div>
                <div style="font-size: 15px; font-weight: 600; color: #1e293b;">Invoices Created · 429 Periods Skipped</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 6px;">Zero duplicate invoices. Run it 100 times — result is identical.</div>
            </div>
        </div>
        <div style="background: #1e1b2e; color: #f1f5f9; padding: 14px 20px; border-radius: 12px; font-family: monospace; font-size: 13px; margin-top: 18px;">
            <span style="color:#c4b5fd;">INSERT INTO</span> invoices (...) <span style="color:#c4b5fd;">ON CONFLICT</span> (subscription_id, period_start) <span style="color:#86efac;">DO NOTHING</span>;
        </div>
        """
    },
    {
        "id": "scene_07",
        "eyebrow": "PAYMENTS & RECONCILIATION",
        "title": "Partial Payments to Automatic Settlement",
        "subtitle": "Invoice status flips Confirmed ➔ Paid when balance reaches ₹0",
        "lead": "'Paid' is an emergent financial state reached only through real payments, never manually toggled. Overpayment rejected with 409.",
        "badges": ["Partial Payments", "Ledger Integrity", "Auto-Status Transition", "Overpayment Guard"],
        "content_html": """
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-top: 24px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
            <div style="font-size: 16px; font-weight: 700; margin-bottom: 14px; color: #1e293b;">Invoice INV-1042 Settlement Flow</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div style="border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; background: #f8fafc;">
                    <div style="font-size: 13px; font-weight: 700; color: #64748b;">PARTIAL PAYMENT (TRANSACTION 1)</div>
                    <div style="display:flex; justify-content:space-between; margin-top: 10px; font-size: 14px;">
                        <span>Invoice Total:</span> <b>₹2,816</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top: 4px; font-size: 14px; color: #0284c7;">
                        <span>Amount Paid:</span> <b>₹1,400</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top: 4px; font-size: 14px; color: #b45309;">
                        <span>Outstanding Balance:</span> <b>₹1,416</b>
                    </div>
                    <div style="margin-top: 12px;"><span style="background: #dbeafe; color: #1d4ed8; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;">Status: Confirmed</span></div>
                </div>
                <div style="border: 2px solid #10b981; border-radius: 12px; padding: 18px; background: #f0fdf4;">
                    <div style="font-size: 13px; font-weight: 700; color: #15803d;">FINAL SETTLEMENT (TRANSACTION 2)</div>
                    <div style="display:flex; justify-content:space-between; margin-top: 10px; font-size: 14px;">
                        <span>Invoice Total:</span> <b>₹2,816</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top: 4px; font-size: 14px; color: #059669;">
                        <span>Total Paid:</span> <b>₹2,816 (100%)</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-top: 4px; font-size: 14px; color: #059669;">
                        <span>Remaining Balance:</span> <b>₹0</b>
                    </div>
                    <div style="margin-top: 12px;"><span style="background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 800;">Status: Paid (Settled)</span></div>
                </div>
            </div>
        </div>
        """
    },
    {
        "id": "scene_08",
        "eyebrow": "SECURITY & ACCESS CONTROL",
        "title": "Strict Role-Based Separation (RBAC)",
        "subtitle": "Admin · Staff · Customer — Every endpoint verified with requireRole",
        "lead": "Customers access only their self-service portal. Any attempt to query staff routes triggers HTTP 403 Forbidden.",
        "badges": ["RBAC", "requireRole Middleware", "Customer Portal", "Zod Validation"],
        "content_html": """
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 26px;">
            <div style="background: #fff; border: 2px solid #714B67; border-radius: 16px; padding: 20px;">
                <div style="display:flex; align-items:center; gap: 10px;">
                    <span style="background: #714B67; color: #fff; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; font-weight: 800;">A</span>
                    <span style="font-size: 18px; font-weight: 800; color: #1e293b;">Admin</span>
                </div>
                <ul style="list-style: none; font-size: 13px; color: #475569; margin-top: 14px; line-height: 1.8;">
                    <li>✓ Full catalogue management</li>
                    <li>✓ Plan & tax configuration</li>
                    <li>✓ Staff credential provisioning</li>
                    <li>✓ All operational access</li>
                </ul>
            </div>
            <div style="background: #fff; border: 2px solid #017E84; border-radius: 16px; padding: 20px;">
                <div style="display:flex; align-items:center; gap: 10px;">
                    <span style="background: #017E84; color: #fff; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; font-weight: 800;">S</span>
                    <span style="font-size: 18px; font-weight: 800; color: #1e293b;">Staff</span>
                </div>
                <ul style="list-style: none; font-size: 13px; color: #475569; margin-top: 14px; line-height: 1.8;">
                    <li>✓ Create & activate subscriptions</li>
                    <li>✓ Execute recurring billing runs</li>
                    <li>✓ Record & settle payments</li>
                    <li style="color: #dc2626;">✕ Restricted from catalogue setup</li>
                </ul>
            </div>
            <div style="background: #fff; border: 2px solid #64748b; border-radius: 16px; padding: 20px;">
                <div style="display:flex; align-items:center; gap: 10px;">
                    <span style="background: #64748b; color: #fff; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; font-weight: 800;">C</span>
                    <span style="font-size: 18px; font-weight: 800; color: #1e293b;">Customer</span>
                </div>
                <ul style="list-style: none; font-size: 13px; color: #475569; margin-top: 14px; line-height: 1.8;">
                    <li>✓ View own subscriptions only</li>
                    <li>✓ View & download own invoices</li>
                    <li style="color: #dc2626;">✕ Staff endpoints ➔ 403 Forbidden</li>
                    <li style="color: #dc2626;">✕ Admin endpoints ➔ 403 Forbidden</li>
                </ul>
            </div>
        </div>
        """
    },
    {
        "id": "scene_09",
        "eyebrow": "FINANCE DASHBOARD & SCALE",
        "title": "Sub-40ms Queries Over 5,000 Subscriptions",
        "subtitle": "Real-time MRR, Revenue Charts, Overdue Aging & CSV Export via SQL Views",
        "lead": "Testing with full realistic volume: 5,000 seeded subscriptions and ~12,000 invoices. Requirement was under 2s; Brightloop delivers in ~30ms.",
        "badges": ["5,000 Subscriptions", "Sub-40ms Response", "PostgreSQL Views", "Recharts Analytics", "CSV Export"],
        "content_html": """
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 24px;">
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700;">ACTIVE SUBS</div>
                <div style="font-size: 26px; font-weight: 800; color: #1e293b; margin-top: 6px;">4,871</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700;">MRR (BASE)</div>
                <div style="font-size: 26px; font-weight: 800; color: #714B67; margin-top: 6px;">₹38 Lakh</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700;">CASH COLLECTED</div>
                <div style="font-size: 26px; font-weight: 800; color: #059669; margin-top: 6px;">₹2.12 Cr</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700;">OUTSTANDING</div>
                <div style="font-size: 26px; font-weight: 800; color: #0284c7; margin-top: 6px;">₹46 Lakh</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700;">OVERDUE (118)</div>
                <div style="font-size: 26px; font-weight: 800; color: #dc2626; margin-top: 6px;">₹9 Lakh</div>
            </div>
        </div>
        <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-top: 16px;">
            <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 12px;">Monthly Revenue Trajectory (Direct SQL Aggregate)</div>
            <div style="display:flex; align-items:flex-end; gap: 16px; height: 110px;">
                <div style="flex:1; background: #714B67; height: 45%; border-radius: 6px 6px 0 0;"></div>
                <div style="flex:1; background: #714B67; height: 58%; border-radius: 6px 6px 0 0;"></div>
                <div style="flex:1; background: #714B67; height: 52%; border-radius: 6px 6px 0 0;"></div>
                <div style="flex:1; background: #714B67; height: 75%; border-radius: 6px 6px 0 0;"></div>
                <div style="flex:1; background: #714B67; height: 68%; border-radius: 6px 6px 0 0;"></div>
                <div style="flex:1; background: #714B67; height: 88%; border-radius: 6px 6px 0 0;"></div>
                <div style="flex:1; background: #017E84; height: 100%; border-radius: 6px 6px 0 0;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top: 6px; font-size: 11px; color: #64748b;">
                <span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span style="font-weight:700; color:#017E84;">Oct (Peak)</span>
            </div>
        </div>
        """
    },
    {
        "id": "scene_10",
        "eyebrow": "ENGINEERING VERIFICATION",
        "title": "47 Passing Automated Tests",
        "subtitle": "Formally Proven Against Live PostgreSQL · Deployed on Render Cloud",
        "lead": "Unit tests, database concurrency locks, RBAC negative testing, and OpenAPI documentation verified end to end.",
        "badges": ["47 Tests Green", "Docker Compose", "OpenAPI Docs", "Render Live", "Zero Flakiness"],
        "content_html": """
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px;">
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;">
                <div style="font-size: 24px;">✅</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 6px;">47 Automated Tests</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">35 unit + access control, 12 DB integration tests. All green.</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;">
                <div style="font-size: 24px;">🔒</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 6px;">Idempotency Proven</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Run 1 created 429 invoices; Run 2 created 0. Double-billing impossible.</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;">
                <div style="font-size: 24px;">⚡</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 6px;">Sub-40ms Performance</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">5,000 subscriptions load in ~30ms, exceeding the 2s requirement by 50x.</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;">
                <div style="font-size: 24px;">🌐</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 6px;">Production Deployed</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Render + Managed PostgreSQL at brightloop-do6a.onrender.com.</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;">
                <div style="font-size: 24px;">📄</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 6px;">OpenAPI Documentation</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Interactive Swagger spec available live at /api/docs.</div>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px;">
                <div style="font-size: 24px;">🐳</div>
                <div style="font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 6px;">1-Command Setup</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">docker compose up --build launches DB, seed, and fullstack app.</div>
            </div>
        </div>
        """
    },
    {
        "id": "scene_11",
        "eyebrow": "CONCLUSION & SUBMISSION",
        "title": "Brightloop — Ready for Production",
        "subtitle": "Built for Odoo x FLUX Lucknow Hackathon '26",
        "lead": "A unified, resilient, high-performance subscription management platform with proven relational guarantees.",
        "badges": ["Hackathon Submission", "Full Production Stack", "Clean Codebase", "Real PostgreSQL"],
        "content_html": """
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px;">
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px;">
                <div style="font-size: 17px; font-weight: 800; color: #1e293b; margin-bottom: 12px;">Submission Deliverables</div>
                <ul style="list-style: none; font-size: 14px; color: #475569; line-height: 2;">
                    <li>✅ <b>Live Production App:</b> brightloop-do6a.onrender.com</li>
                    <li>✅ <b>Docker Compose:</b> Reproducible single-command run</li>
                    <li>✅ <b>Full Test Suite:</b> 47 passing automated tests</li>
                    <li>✅ <b>OpenAPI Specification:</b> Interactive docs at /api/docs</li>
                </ul>
            </div>
            <div style="background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 16px; padding: 22px;">
                <div style="font-size: 17px; font-weight: 800; color: #86198f; margin-bottom: 12px;">Pre-Seeded Demo Credentials</div>
                <div style="font-size: 13px; line-height: 1.8; color: #475569;">
                    <b>Admin:</b> <code>admin@brightloop.test</code> / <code>Admin@12345</code><br/>
                    <b>Staff:</b> <code>staff@brightloop.test</code> / <code>Staff@12345</code><br/>
                    <b>Customer:</b> <code>customer@brightloop.test</code> / <code>Customer@123</code>
                </div>
                <div style="margin-top: 14px; font-size: 12px; color: #701a75; font-weight: 600;">
                    Thank you for reviewing Brightloop!
                </div>
            </div>
        </div>
        """
    }
]

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1920px;
    height: 1080px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: radial-gradient(1400px 900px at 20% -10%, #ede4ec 0%, #f7f5f8 60%);
    color: #1e293b;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 80px 40px 80px;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
  }}
  .logo {{
    display: flex;
    align-items: center;
    gap: 16px;
  }}
  .logo-mark {{
    width: 54px;
    height: 54px;
    border-radius: 14px;
    background: linear-gradient(135deg, #714B67, #017E84);
    display: grid;
    place-items: center;
    color: #fff;
    font-size: 26px;
    font-weight: 800;
    box-shadow: 0 8px 20px rgba(113,75,103,0.35);
  }}
  .logo-title {{
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #1e293b;
  }}
  .badge-container {{
    display: flex;
    gap: 8px;
    align-items: center;
  }}
  .badge {{
    background: #fff;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 700;
    color: #475569;
  }}
  .main-card {{
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 24px;
    padding: 44px 50px;
    box-shadow: 0 20px 50px rgba(40, 20, 45, 0.08);
    flex: 1;
    margin: 28px 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }}
  .eyebrow {{
    color: #017E84;
    font-weight: 800;
    letter-spacing: 0.12em;
    font-size: 14px;
    text-transform: uppercase;
  }}
  .title {{
    font-size: 46px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: #1e293b;
    margin-top: 8px;
  }}
  .subtitle {{
    font-size: 22px;
    font-weight: 700;
    color: #714B67;
    margin-top: 4px;
  }}
  .lead {{
    font-size: 18px;
    color: #64748b;
    margin-top: 14px;
    line-height: 1.5;
    max-width: 1400px;
  }}
  .footer {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
    padding-top: 18px;
  }}
  .scene-pill {{
    background: #714B67;
    color: #fff;
    font-weight: 800;
    padding: 6px 16px;
    border-radius: 999px;
    font-size: 13px;
  }}
</style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-mark">B</div>
      <div class="logo-title">Brightloop</div>
      <span style="color: #94a3b8; font-size: 20px; margin: 0 4px;">·</span>
      <span style="font-size: 15px; font-weight: 700; color: #714B67;">Odoo x FLUX Lucknow Hackathon</span>
    </div>
    <div class="badge-container">
      {badges_html}
    </div>
  </div>

  <div class="main-card">
    <div class="eyebrow">{eyebrow}</div>
    <div class="title">{title}</div>
    <div class="subtitle">{subtitle}</div>
    <div class="lead">{lead}</div>
    {content_html}
  </div>

  <div class="footer">
    <div><b>Live Deployment:</b> brightloop-do6a.onrender.com &nbsp;|&nbsp; <b>Local:</b> localhost:3000</div>
    <div class="scene-pill">{scene_pill}</div>
  </div>
</body>
</html>
"""

def generate_slides():
    os.makedirs("d:/slides", exist_ok=True)
    chrome_path = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    
    for idx, s in enumerate(SLIDES_DATA):
        badges_html = "".join([f'<div class="badge">{b}</div>' for b in s["badges"]])
        scene_pill = f"SCENE {idx+1:02d} / {len(SLIDES_DATA):02d}"
        html = HTML_TEMPLATE.format(
            eyebrow=s["eyebrow"],
            title=s["title"],
            subtitle=s["subtitle"],
            lead=s["lead"],
            badges_html=badges_html,
            content_html=s["content_html"],
            scene_pill=scene_pill
        )
        html_file = f"d:/slides/{s['id']}.html"
        png_file = f"d:/slides/{s['id']}.png"
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html)
        
        print(f"Rendering {s['id']}.png with Chrome headless...")
        cmd = [
            chrome_path,
            "--headless=new",
            "--disable-gpu",
            "--force-device-scale-factor=1",
            "--window-size=1920,1080",
            f"--screenshot={png_file}",
            f"file:///{html_file}"
        ]
        subprocess.run(cmd, check=True)
        print(f"Rendered {png_file}")

if __name__ == "__main__":
    generate_slides()
    print("All 11 slides rendered successfully!")

