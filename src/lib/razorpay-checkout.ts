/**
 * Client-side utility for opening Razorpay Checkout.
 *
 * Usage in a React component:
 *
 *   import { openRazorpayCheckout } from "@/lib/razorpay-checkout";
 *
 *   const handleUpgrade = async (billingCycle: "monthly" | "annually") => {
 *     const res = await fetch("/api/billing/subscribe", {
 *       method: "POST",
 *       headers: { "Content-Type": "application/json" },
 *       body: JSON.stringify({ billingCycle }),
 *     });
 *     const { subscriptionId, keyId } = await res.json();
 *
 *     await openRazorpayCheckout({
 *       keyId,
 *       subscriptionId,
 *       name: "Espada Pro",
 *       description: billingCycle === "monthly" ? "$4.99/mo" : "$39/yr",
 *     });
 *   };
 */

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface CheckoutOptions {
  keyId: string;
  subscriptionId: string;
  name: string;
  description?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Load the Razorpay checkout script if not already present.
 */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.head.appendChild(script);
  });
}

/**
 * Open Razorpay Checkout for a subscription.
 * Resolves with the payment response on success, rejects on dismissal.
 */
export async function openRazorpayCheckout(
  options: CheckoutOptions
): Promise<RazorpayResponse> {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: options.keyId,
      subscription_id: options.subscriptionId,
      name: options.name,
      description: options.description,
      handler: (response) => {
        resolve(response);
      },
      prefill: {
        name: options.userName,
        email: options.userEmail,
      },
      theme: {
        color: "#ffffff",
      },
      modal: {
        ondismiss: () => {
          reject(new Error("Payment cancelled by user"));
        },
      },
    });

    rzp.open();
  });
}
