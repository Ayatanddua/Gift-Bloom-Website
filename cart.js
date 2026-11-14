// Gift Bloom Shared Shopping Cart

var cart = JSON.parse(localStorage.getItem("giftBloomCart")) || [];

// Save Cart to LocalStorage
function saveCart() {
    localStorage.setItem("giftBloomCart", JSON.stringify(cart));
    updateCart();
}

// Add To Cart
function addToCart(button) {
    var id = button.dataset.id || "item-" + Date.now();
    var baseName = button.dataset.name || "Gift Item";
    var price = Number(button.dataset.price) || 0;
    var image = button.dataset.image || "Gift bloom-favicon.jpg";

    // Check for quantity element on the page (e.g., in product detail pages)
    var qtyEl = document.getElementById("qty");
    var addQty = 1;
    if (button.dataset.qty) {
        addQty = Math.max(1, parseInt(button.dataset.qty, 10) || 1);
    } else if (qtyEl) {
        addQty = Math.max(1, parseInt(qtyEl.innerText || qtyEl.value, 10) || 1);
    }

    // Check for selected size on product pages
    var sizeEl = document.querySelector(".size-btn.bg-pink-50, .size-btn.border-pink-500");
    var selectedSize = sizeEl ? sizeEl.innerText.trim() : "";
    var name = selectedSize ? (baseName + " (" + selectedSize + ")") : baseName;
    var itemKey = selectedSize ? (id + "-" + selectedSize.toLowerCase()) : id;

    var existingItem = cart.find(function (item) {
        return item.id === itemKey;
    });

    if (existingItem) {
        existingItem.quantity += addQty;
    } else {
        cart.push({
            id: itemKey,
            name: name,
            price: price,
            image: image,
            quantity: addQty
        });
    }

    saveCart();
    openCart();

    // Visual button feedback
    var origText = button.innerHTML;
    button.classList.add("bg-green-600");
    button.innerText = "Added to Cart ✓";
    setTimeout(function () {
        button.classList.remove("bg-green-600");
        button.innerHTML = origText;
    }, 1500);
}

// Update Cart Display
function updateCart() {
    var cartCount = document.getElementById("cartCount");
    var cartItems = document.getElementById("cartItems");
    var cartTotal = document.getElementById("cartTotal");

    var totalQuantity = 0;
    var totalPrice = 0;
    var hasCustomPrice = false;

    cart.forEach(function (item) {
        totalQuantity += item.quantity;
        totalPrice += item.price * item.quantity;
        if (item.price === 0) {
            hasCustomPrice = true;
        }
    });

    // Update Cart Counter Badge
    if (cartCount) {
        cartCount.textContent = totalQuantity;
    }

    // Update Cart Total
    if (cartTotal) {
        if (cart.length === 0) {
            cartTotal.textContent = "PKR 0";
        } else if (hasCustomPrice && totalPrice === 0) {
            cartTotal.textContent = "On Customization";
        } else if (hasCustomPrice && totalPrice > 0) {
            cartTotal.textContent = "PKR " + totalPrice.toLocaleString() + " (+ Custom)";
        } else {
            cartTotal.textContent = "PKR " + totalPrice.toLocaleString();
        }
    }

    if (!cartItems) {
        return;
    }

    // Empty Cart State
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="py-12 text-center text-gray-500">
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p class="font-medium text-gray-600">Your cart is currently empty!</p>
                <p class="text-xs text-gray-400 mt-1">Explore our gifts to add items here.</p>
            </div>
        `;
        return;
    }

    // Render Cart Products
    cartItems.innerHTML = "";

    cart.forEach(function (item) {
        var itemDiv = document.createElement("div");
        itemDiv.className = "mb-4 flex gap-3 border-b border-gray-200 pb-4 dark:border-slate-700";

        var priceDisplay = item.price > 0
            ? "PKR " + (item.price * item.quantity).toLocaleString() + (item.quantity > 1 ? (" (PKR " + item.price.toLocaleString() + " each)") : "")
            : "Price on Customization";

        itemDiv.innerHTML = `
            <img src="${item.image}"
                class="h-20 w-20 rounded-lg object-cover border border-gray-200 shadow-sm"
                alt="${item.name}"
                onerror="this.src='Gift bloom-favicon.jpg'">

            <div class="flex-1 flex flex-col justify-between">
                <div>
                    <h3 class="font-semibold text-gray-800 text-sm leading-snug">
                        ${item.name}
                    </h3>
                    <p class="mt-1 text-xs font-semibold text-pink-600">
                        ${priceDisplay}
                    </p>
                </div>

                <div class="mt-2 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            onclick="changeQuantity('${item.id}', -1)"
                            class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-pink-100 hover:text-pink-700 font-bold border border-gray-300 transition"
                            title="Decrease quantity">
                            −
                        </button>

                        <span class="min-w-6 text-center text-sm font-semibold text-gray-800">${item.quantity}</span>

                        <button
                            type="button"
                            onclick="changeQuantity('${item.id}', 1)"
                            class="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-700 hover:bg-pink-100 hover:text-pink-700 font-bold border border-gray-300 transition"
                            title="Increase quantity">
                            +
                        </button>
                    </div>

                    <button
                        type="button"
                        onclick="removeItem('${item.id}')"
                        class="text-xs font-medium text-red-500 hover:text-red-700 hover:underline">
                        Remove
                    </button>
                </div>
            </div>
        `;

        cartItems.appendChild(itemDiv);
    });
}

// Change Quantity
function changeQuantity(id, change) {
    var item = cart.find(function (product) {
        return product.id === id;
    });

    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart = cart.filter(function (product) {
            return product.id !== id;
        });
    }

    saveCart();
}

// Remove Item
function removeItem(id) {
    cart = cart.filter(function (item) {
        return item.id !== id;
    });

    saveCart();
}

// Open Cart
function openCart() {
    var cartEl = document.getElementById("shoppingCart");
    var overlayEl = document.getElementById("cartOverlay");

    if (cartEl) {
        cartEl.classList.remove("translate-x-full");
    }
    if (overlayEl) {
        overlayEl.classList.remove("hidden");
    }
}

// Close Cart
function closeCart() {
    var cartEl = document.getElementById("shoppingCart");
    var overlayEl = document.getElementById("cartOverlay");

    if (cartEl) {
        cartEl.classList.add("translate-x-full");
    }
    if (overlayEl) {
        overlayEl.classList.add("hidden");
    }
}

// Checkout via WhatsApp with full formatted cart list
function checkoutCart() {
    if (!cart || cart.length === 0) {
        alert("Your cart is empty! Please add some gift items first.");
        return;
    }

    var message = "Hello Gift Bloom! 👋\nI would like to place an order from your website:\n\n";
    var totalPrice = 0;
    var hasCustomPrice = false;

    cart.forEach(function (item, index) {
        var itemTotal = item.price > 0 ? ("PKR " + (item.price * item.quantity).toLocaleString()) : "Price on Customization";
        message += (index + 1) + ". *" + item.name + "*\n";
        message += "   Quantity: " + item.quantity + "\n";
        message += "   Price: " + itemTotal + "\n\n";

        if (item.price > 0) {
            totalPrice += item.price * item.quantity;
        } else {
            hasCustomPrice = true;
        }
    });

    message += "--------------------------\n";
    if (hasCustomPrice && totalPrice > 0) {
        message += "*Estimated Total:* PKR " + totalPrice.toLocaleString() + " (+ Customization items)\n";
    } else if (hasCustomPrice) {
        message += "*Total:* Price on Customization\n";
    } else {
        message += "*Total Amount:* PKR " + totalPrice.toLocaleString() + "\n";
    }
    message += "--------------------------\n";
    message += "Please let me know delivery details and payment process. Thank you! 🎁";

    var whatsappUrl = "https://wa.me/923227079455?text=" + encodeURIComponent(message);
    window.open(whatsappUrl, "_blank");
}

// Close Cart With Escape Key
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeCart();
    }
});

// Expose functions globally on window
window.cart = cart;
window.saveCart = saveCart;
window.addToCart = addToCart;
window.updateCart = updateCart;
window.changeQuantity = changeQuantity;
window.removeItem = removeItem;
window.openCart = openCart;
window.closeCart = closeCart;
window.checkoutCart = checkoutCart;

// Initial render
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateCart);
} else {
    updateCart();
}
