
// Gift Bloom Shared Shopping Cart

var cart = JSON.parse(localStorage.getItem("giftBloomCart")) || [];


// Save Cart
function saveCart() {

    localStorage.setItem("giftBloomCart", JSON.stringify(cart));

    updateCart();
}


// Add To Cart
function addToCart(button) {

    var id = button.dataset.id;
    var name = button.dataset.name;
    var price = Number(button.dataset.price);
    var image = button.dataset.image;

    var existingItem = cart.find(function (item) {
        return item.id === id;
    });

    if (existingItem) {

        existingItem.quantity++;

    } else {

        cart.push({
            id: id,
            name: name,
            price: price,
            image: image,
            quantity: 1
        });

    }

    saveCart();

    openCart();
}


// Update Cart
function updateCart() {

    var cartCount = document.getElementById("cartCount");
    var cartItems = document.getElementById("cartItems");
    var cartTotal = document.getElementById("cartTotal");

    if (!cartCount || !cartItems || !cartTotal) {
        return;
    }

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

    // Cart Count
    cartCount.textContent = totalQuantity;


    // Cart Total
    if (hasCustomPrice) {

        cartTotal.textContent = "On Your Customization";

    } else {

        cartTotal.textContent =
            "PKR " + totalPrice.toLocaleString();

    }


    // Empty Cart
    if (cart.length === 0) {

        cartItems.innerHTML =
            '<p class="py-10 text-center text-gray-500">Your cart is empty!</p>';

        cartTotal.textContent = "PKR 0";

        return;
    }


    // Show Cart Products
    cartItems.innerHTML = "";

    cart.forEach(function (item) {

        var itemDiv = document.createElement("div");

        itemDiv.className =
            "mb-4 flex gap-3 border-b border-gray-200 pb-4";

        itemDiv.innerHTML = `

            <img src="${item.image}"
                class="h-20 w-20 rounded-lg object-cover"
                alt="${item.name}">

            <div class="flex-1">

                <h3 class="font-semibold text-white">
                    ${item.name}
                </h3>

                <p class="mt-1 text-sm text-white">

                    ${item.price > 0
                ? "PKR " + item.price.toLocaleString()
                : "On Your Customization"}

                </p>

                <div class="mt-2 flex items-center gap-3">

                    <button
                        onclick="changeQuantity('${item.id}', -1)"
                        class="h-7 w-7 rounded">
                        −
                    </button>

                    <span>${item.quantity}</span>

                    <button
                        onclick="changeQuantity('${item.id}', 1)"
                        class="h-7 w-7 rounded">
                        +
                    </button>

                    <button
                        onclick="removeItem('${item.id}')"
                        class="ml-auto text-sm text-red-500">
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

    document.getElementById("shoppingCart")
        .classList.remove("translate-x-full");

    document.getElementById("cartOverlay")
        .classList.remove("hidden");

}


// Close Cart
function closeCart() {

    document.getElementById("shoppingCart")
        .classList.add("translate-x-full");

    document.getElementById("cartOverlay")
        .classList.add("hidden");

}


// Checkout
function checkoutCart() {

    if (cart.length === 0) {

        alert("Your cart is empty!");

        return;

    }

    alert("Your cart is ready! Checkout functionality can be connected later.");

}


// Close Cart With Escape Key
document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {

        closeCart();

    }

});


// Load Saved Cart
updateCart();