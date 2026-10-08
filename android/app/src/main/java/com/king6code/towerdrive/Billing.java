package com.king6code.towerdrive;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/* Google Play Billing exposé au jeu sous window.NativeBilling.
   Le jeu crédite l'achat puis appelle finish(token, consumable) : consommation ou accusé de réception. */
public class Billing {
    static final String[] INAPP_IDS = {
        "direct_link", "starter_pack", "epic_pack", "season_pass",
        "gems_20", "gems_110", "gems_248", "gems_550", "gems_880", "gems_1540", "gems_3300"
    };

    private final Activity act;
    private final WebView web;
    private BillingClient client;
    private final Map<String, ProductDetails> products = new HashMap<String, ProductDetails>();
    private volatile boolean ready = false;

    Billing(Activity act, WebView web) {
        this.act = act;
        this.web = web;
        client = BillingClient.newBuilder(act)
            .setListener(new PurchasesUpdatedListener() {
                @Override public void onPurchasesUpdated(BillingResult r, List<Purchase> list) {
                    if (r.getResponseCode() == BillingClient.BillingResponseCode.OK && list != null) {
                        for (Purchase p : list) deliver(p);
                    } else {
                        js("window.__iapFail&&window.__iapFail(" + r.getResponseCode() + ")");
                    }
                }
            })
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
        connect();
    }

    private void connect() {
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult r) {
                if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
                ready = true;
                queryProducts();
                restorePurchases();
            }
            @Override public void onBillingServiceDisconnected() { ready = false; }
        });
    }

    private void queryProducts() {
        List<QueryProductDetailsParams.Product> q = new ArrayList<QueryProductDetailsParams.Product>();
        for (String id : INAPP_IDS) {
            q.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        }
        client.queryProductDetailsAsync(
            QueryProductDetailsParams.newBuilder().setProductList(q).build(),
            new com.android.billingclient.api.ProductDetailsResponseListener() {
                @Override public void onProductDetailsResponse(BillingResult r, List<ProductDetails> list) {
                    StringBuilder sb = new StringBuilder("{");
                    for (ProductDetails d : list) {
                        products.put(d.getProductId(), d);
                        ProductDetails.OneTimePurchaseOfferDetails o = d.getOneTimePurchaseOfferDetails();
                        if (o == null) continue;
                        if (sb.length() > 1) sb.append(',');
                        sb.append('"').append(d.getProductId()).append("\":\"")
                          .append(o.getFormattedPrice().replace("\"", "").replace("\\", "")).append('"');
                    }
                    sb.append('}');
                    js("window.__iapPrices&&window.__iapPrices(" + sb + ")");
                }
            });
    }

    /* Rejoue les achats non finalisés (consommables non consommés, non-consommables à restaurer) */
    private void restorePurchases() {
        client.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            new com.android.billingclient.api.PurchasesResponseListener() {
                @Override public void onQueryPurchasesResponse(BillingResult r, List<Purchase> list) {
                    for (Purchase p : list) deliver(p);
                }
            });
    }

    private void deliver(Purchase p) {
        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return;
        for (String sku : p.getProducts()) {
            js("window.__iapDone&&window.__iapDone('" + sku + "','" + p.getPurchaseToken() + "','" + p.getOrderId() + "')");
        }
    }

    private void js(final String code) {
        act.runOnUiThread(new Runnable() {
            @Override public void run() { web.evaluateJavascript(code, null); }
        });
    }

    @JavascriptInterface public boolean isAvailable() { return ready; }

    @JavascriptInterface public void buy(final String sku) {
        act.runOnUiThread(new Runnable() {
            @Override public void run() {
                ProductDetails d = products.get(sku);
                if (!ready || d == null) {
                    js("window.__iapFail&&window.__iapFail(-1)");
                    if (!ready) connect();
                    return;
                }
                List<BillingFlowParams.ProductDetailsParams> pl = new ArrayList<BillingFlowParams.ProductDetailsParams>();
                pl.add(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build());
                client.launchBillingFlow(act, BillingFlowParams.newBuilder().setProductDetailsParamsList(pl).build());
            }
        });
    }

    @JavascriptInterface public void finish(final String token, final boolean consumable) {
        act.runOnUiThread(new Runnable() {
            @Override public void run() {
                if (!ready) return;
                if (consumable) {
                    client.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(),
                        new com.android.billingclient.api.ConsumeResponseListener() {
                            @Override public void onConsumeResponse(BillingResult r, String t) {}
                        });
                } else {
                    client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(token).build(),
                        new com.android.billingclient.api.AcknowledgePurchaseResponseListener() {
                            @Override public void onAcknowledgePurchaseResponse(BillingResult r) {}
                        });
                }
            }
        });
    }

    @JavascriptInterface public void restore() {
        act.runOnUiThread(new Runnable() {
            @Override public void run() { if (ready) restorePurchases(); }
        });
    }
}
