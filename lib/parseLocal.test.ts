import assert from "node:assert/strict";
import { parseLocal } from "./parseLocal";

const a = parseLocal("swap 5 OKB for USDC");
assert.equal(a.action, "swap");
assert.equal(a.tokenIn, "OKB");
assert.equal(a.tokenOut, "USDC");
assert.equal(a.amountIn, "5");
assert.equal(a.amountType, "absolute");
assert.equal(a.condition, null);
assert.equal(a.confidence, "high");

const b = parseLocal("dump my OKB into USDC once it pumps past 55 bucks");
assert.equal(b.action, "limit_order");
assert.equal(b.tokenIn, "OKB");
assert.equal(b.tokenOut, "USDC");
assert.equal(b.amountIn, "ALL");
assert.equal(b.condition?.type, "price_above");
assert.equal(b.condition?.asset, "OKB");
assert.equal(b.condition?.value, 55);

const c = parseLocal("swap half my USDT for ETH if it drops below 2800");
assert.equal(c.action, "limit_order");
assert.equal(c.tokenIn, "USDT");
assert.equal(c.tokenOut, "ETH");
assert.equal(c.amountIn, "HALF");
assert.equal(c.amountType, "percentage");
assert.equal(c.condition?.type, "price_below");
assert.equal(c.condition?.asset, "ETH");
assert.equal(c.condition?.value, 2800);

const d = parseLocal("trade some okb for usdc");
assert.equal(d.action, "clarify");
assert.equal(d.tokenIn, "OKB");
assert.equal(d.tokenOut, "USDC");
assert.ok(d.clarifyingQuestion);

const e = parseLocal("cancel my order #12");
assert.equal(e.action, "cancel");
assert.equal(e.orderIdToCancel, "12");

const f = parseLocal("swap 2 SOL for USDC");
assert.equal(f.action, "clarify");

console.log("parseLocal examples passed");
