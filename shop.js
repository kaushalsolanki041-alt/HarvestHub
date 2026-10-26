(() => {
  const key = 'harvesthub-v1';
  const sections = [...document.querySelectorAll('.detailed')];
  const categories = sections.map(section => section.querySelector('.names').id);
  const seeds = sections.flatMap(section => [...section.querySelectorAll('.products')].map((card, index) => ({
    id: `${section.querySelector('.names').id}-${index}`,
    category: section.querySelector('.names').id,
    name: card.querySelector('.pname > div').textContent.trim(),
    price: Math.round(Number(card.querySelector('.price span').textContent) * 100),
    unit: card.querySelector('.price').textContent.split('per/')[1].trim(),
    image: card.querySelector('img').getAttribute('src')
  })));
  const empty = () => ({ products: [], deleted: [], bag: [], orders: [] });
  const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100);
  const safeImage = value => /^https?:\/\//i.test(value) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(value);
  const validProduct = p => p && typeof p.id === 'string' && categories.includes(p.category) && typeof p.name === 'string' && p.name.trim() && Number.isSafeInteger(p.price) && p.price > 0 && p.price <= 10000000 && typeof p.unit === 'string' && typeof p.image === 'string' && safeImage(p.image);
  let state = empty();
  let storageError = false;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const saved = JSON.parse(raw);
      if (!saved || !['products', 'deleted', 'bag', 'orders'].every(field => Array.isArray(saved[field])) || !saved.products.every(validProduct) || !saved.deleted.every(id => typeof id === 'string') || !saved.bag.every(item => item && typeof item.id === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99)) throw new Error();
      state = saved;
    }
  } catch {
    storageError = true;
  }
  const catalog = () => [...seeds, ...state.products].filter(p => !state.deleted.includes(p.id));
  const items = () => state.bag.map(item => ({ ...item, product: catalog().find(p => p.id === item.id) })).filter(item => item.product);
  const total = () => items().reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, action, className = 'shop-button') => {
    const node = element('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const notice = element('p', 'shop-notice');
  notice.setAttribute('role', 'status');
  document.body.append(notice);
  let timer;
  function notify(message) {
    clearTimeout(timer);
    (dialog.open ? dialog : document.body).append(notice);
    notice.textContent = message;
    notice.hidden = false;
    timer = setTimeout(() => { notice.hidden = true; }, 5000);
  }
  notice.hidden = true;
  function save(next) {
    if (storageError) {
      notify('Saved data could not be read. Enable browser storage or clear Harvest Hub site data before making changes.');
      return false;
    }
    try {
      localStorage.setItem(key, JSON.stringify(next));
      state = next;
      render();
      return true;
    } catch {
      notify('Could not save changes. Browser storage may be full or unavailable.');
      return false;
    }
  }
  const dialog = element('dialog', 'shop-dialog');
  dialog.setAttribute('aria-labelledby', 'shop-title');
  document.body.append(dialog);
  function open(title) {
    dialog.replaceChildren();
    const heading = element('div', 'shop-heading');
    const h = element('h2', '', title);
    h.id = 'shop-title';
    heading.append(h, button('Close', () => dialog.close(), 'shop-link'));
    dialog.append(heading);
    if (!dialog.open) dialog.showModal();
  }
  const cart = document.querySelectorAll('.linkss')[3];
  const cartButton = button('Cart (0)', showBag, 'shop-cart');
  cart.replaceChildren(cartButton, element('div', 'arrow'));
  sections.forEach(section => {
    const heading = section.querySelector('.names');
    heading.append(button('Manage', () => showManager(heading.id), 'shop-manage'));
  });
  function changeQuantity(id, difference) {
    if (!catalog().some(p => p.id === id)) return;
    const current = state.bag.find(item => item.id === id)?.quantity || 0;
    if (current + difference > 99) return notify('Maximum quantity is 99 per product.');
    const bag = state.bag.filter(item => item.id !== id);
    if (current + difference > 0) bag.push({ id, quantity: current + difference });
    return save({ ...state, bag });
  }
  function render() {
    const search = document.querySelector('#but').value.trim().toLowerCase();
    sections.forEach(section => {
      const category = section.querySelector('.names').id;
      const container = section.querySelector('.productsContainer');
      container.replaceChildren();
      catalog().filter(p => p.category === category && p.name.toLowerCase().includes(search)).forEach(p => {
        const card = element('div', 'products');
        const picture = element('div', 'pic');
        const img = element('img');
        img.src = p.image;
        img.alt = p.name;
        img.loading = 'lazy';
        picture.append(img);
        const name = element('div', 'pname');
        const add = button('+', () => {
          if (changeQuantity(p.id, 1)) notify(`${p.name} added to bag.`);
        }, 'shop-add');
        add.setAttribute('aria-label', `Add ${p.name} to bag`);
        name.append(element('div', '', p.name), add);
        const price = element('div', 'price');
        price.append(element('span', '', String(p.price / 100)), document.createTextNode(` per/${p.unit}`));
        card.append(picture, name, price);
        container.append(card);
      });
      if (!container.children.length) container.append(element('p', 'shop-empty', search ? 'No matching products.' : 'No products in this category.'));
    });
    cartButton.textContent = `Cart (${items().reduce((sum, item) => sum + item.quantity, 0)})`;
  }
  document.querySelector('#but').addEventListener('input', render);
  document.querySelector('#but').setAttribute('aria-label', 'Search products');
  function showBag() {
    open('Your bag');
    if (!items().length) {
      dialog.append(element('p', 'shop-empty', 'Your bag is empty.'));
      return;
    }
    items().forEach(({ product, quantity }) => {
      const row = element('div', 'shop-row');
      const details = element('div');
      details.append(element('strong', '', product.name), element('p', '', `${money(product.price)} per/${product.unit}`));
      const controls = element('div', 'shop-quantity');
      const minus = button('-', () => { if (changeQuantity(product.id, -1)) showBag(); });
      minus.setAttribute('aria-label', `Decrease ${product.name}`);
      const plus = button('+', () => { if (changeQuantity(product.id, 1)) showBag(); });
      plus.setAttribute('aria-label', `Increase ${product.name}`);
      plus.disabled = quantity >= 99;
      const remove = button('Remove', () => {
        if (save({ ...state, bag: state.bag.filter(item => item.id !== product.id) })) showBag();
      }, 'shop-link');
      remove.setAttribute('aria-label', `Remove ${product.name}`);
      controls.append(minus, element('span', '', quantity), plus, remove);
      row.append(details, controls, element('strong', '', money(product.price * quantity)));
      dialog.append(row);
    });
    dialog.append(element('p', 'shop-total', `Total: ${money(total())}`), button('Checkout', showCheckout));
  }
  function field(form, labelText, name, type = 'text') {
    const label = element('label', 'shop-field', labelText);
    const input = element('input');
    input.name = name;
    input.type = type;
    input.required = true;
    input.maxLength = 120;
    label.append(input);
    form.append(label);
    return input;
  }
  function showCheckout() {
    if (!items().length) return showBag();
    open('Checkout');
    const form = element('form', 'shop-form');
    const name = field(form, 'Full name', 'name');
    name.autocomplete = 'name';
    const phone = field(form, 'Phone number', 'phone', 'tel');
    phone.pattern = '[0-9]{10}';
    phone.maxLength = 10;
    phone.autocomplete = 'tel-national';
    phone.title = 'Enter a 10-digit phone number';
    const address = field(form, 'Delivery address', 'address');
    address.autocomplete = 'street-address';
    address.maxLength = 300;
    const city = field(form, 'City', 'city');
    city.autocomplete = 'address-level2';
    const pin = field(form, 'PIN code', 'pin');
    pin.pattern = '[1-9][0-9]{5}';
    pin.maxLength = 6;
    pin.inputMode = 'numeric';
    pin.autocomplete = 'postal-code';
    form.append(element('p', '', 'Cash on delivery. Demo checkout: no payment is collected and no delivery is arranged.'), element('p', 'shop-total', `Total: ${money(total())}`));
    const submit = element('button', 'shop-button', 'Place order');
    submit.type = 'submit';
    form.append(submit, button('Back to bag', showBag, 'shop-link'));
    form.addEventListener('submit', event => {
      event.preventDefault();
      const inputs = [...form.querySelectorAll('input')];
      inputs.forEach(input => { input.value = input.value.trim(); });
      if (!form.reportValidity() || !items().length) return;
      const order = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        customer: Object.fromEntries(new FormData(form)),
        items: items().map(({ product, quantity }) => ({ id: product.id, name: product.name, unit: product.unit, price: product.price, quantity })),
        total: total(),
        payment: 'Cash on delivery'
      };
      submit.disabled = true;
      if (!save({ ...state, bag: [], orders: [...state.orders, order] })) {
        submit.disabled = false;
        return;
      }
      open('Order saved');
      dialog.append(element('p', '', `Order ID: ${order.id}`), element('p', 'shop-total', `Total: ${money(order.total)}`), element('p', '', 'Your demo order has been saved on this browser.'), button('Continue shopping', () => dialog.close()));
    });
    dialog.append(form);
  }
  function showManager(category) {
    open(`Manage ${category}`);
    const form = element('form', 'shop-form');
    const name = field(form, 'Product name', 'name');
    name.maxLength = 60;
    const price = field(form, 'Price in rupees', 'price', 'number');
    price.min = '0.01';
    price.max = '100000';
    price.step = '0.01';
    const unit = field(form, 'Unit', 'unit');
    unit.maxLength = 30;
    unit.placeholder = 'kg, piece, pack or Liter';
    const image = field(form, 'Image URL', 'image', 'url');
    image.maxLength = 2000;
    image.placeholder = 'https://example.com/product.jpg';
    const submit = element('button', 'shop-button', 'Add product');
    submit.type = 'submit';
    form.append(submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      [name, price, unit, image].forEach(input => { input.value = input.value.trim(); });
      if (!form.reportValidity()) return;
      const product = { id: crypto.randomUUID(), category, name: name.value, price: Math.round(Number(price.value) * 100), unit: unit.value, image: image.value };
      if (!validProduct(product)) return notify('Enter a valid product and an http or https image URL.');
      if (save({ ...state, products: [...state.products, product] })) {
        showManager(category);
        notify('Product added.');
      }
    });
    dialog.append(form, element('h3', 'shop-subheading', 'Existing products'));
    const products = catalog().filter(p => p.category === category);
    if (!products.length) dialog.append(element('p', 'shop-empty', 'No products in this category.'));
    products.forEach(p => {
      const row = element('div', 'shop-row');
      row.append(element('span', '', `${p.name} - ${money(p.price)} per/${p.unit}`), button(`Delete ${p.name}`, () => {
        if (!confirm(`Delete ${p.name}? It will also be removed from your bag.`)) return;
        const next = {
          ...state,
          products: state.products.filter(product => product.id !== p.id),
          deleted: seeds.some(product => product.id === p.id) ? [...state.deleted, p.id] : state.deleted,
          bag: state.bag.filter(item => item.id !== p.id)
        };
        if (save(next)) showManager(category);
      }, 'shop-link'));
      dialog.append(row);
    });
  }
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) location.reload();
  });
  render();
  if (storageError) notify('Saved data could not be read. Enable browser storage or clear Harvest Hub site data before making changes.');
})();
