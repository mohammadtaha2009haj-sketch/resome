(() => {
  const SUPABASE_URL = "https://donxdhhezslxoroiqmts.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_eJ8-urSwWyV689AzweNKrA_-CkQcjCC";
  const ADMIN_EMAIL = "mohammadtaha2009haj@gmail.com";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    const grid = document.getElementById("productGrid");
    if (grid) {
      grid.innerHTML =
        '<div class="empty">بارگذاری ابزار فروشگاه انجام نشد. صفحه را تازه کنید.</div>';
    }
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const state = {
    products: [],
    session: null,
    pendingDeleteId: null,
    formCovers: [],
    formImages: [],
    formVideos: [],
    pendingMedia: {},
    gallery: [],
    galleryIndex: 0,
    reviews: [],
    customers: [],
    page: 1,
    perPage: 10,
    sort: "default",
    priceMin: 0,
    priceMax: 30000000,
    axisMin: 0,
    axisMax: 30000000,
    pay: {
      cardNumber: "1885581786196219",
      cardHolder: "محمد طاها حاجی قربان",
    },
    homeCards: [],
    stories: [],
    cardFilter: null,
    catIndex: 0,
  };

  const PAY_KEY = "drup-shop-pay";

  function formatCardNumber(value) {
    return String(value || "")
      .replace(/[^\d]/g, "")
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, "$1 ");
  }

  function applyPayInfo() {
    const number = formatCardNumber(state.pay.cardNumber);
    const holder = state.pay.cardHolder || "";
    const numberBox = $("#payCardNumber");
    const holderBox = $("#payCardHolder");
    const numberInput = $("#cardNumber");
    const holderInput = $("#cardHolder");
    if (numberBox) numberBox.textContent = number;
    if (holderBox) holderBox.textContent = holder;
    if (numberInput) numberInput.value = state.pay.cardNumber.replace(/[^\d]/g, "");
    if (holderInput) holderInput.value = holder;
  }

  function uniqueCategories() {
    return [...new Set(state.products.map((item) => item.category).filter(Boolean))];
  }

  function fillCategoryLists() {
    const list = $("#categoryOptions");
    if (!list) return;
    list.innerHTML = uniqueCategories()
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
  }

  function renderHomeCards() {
    const wrap = $("#catWrap");
    const track = $("#catTrack");
    if (!wrap || !track) return;
    const cards = (state.homeCards || []).filter((item) => item.image);
    if (!cards.length) {
      wrap.classList.add("hidden");
      track.innerHTML = "";
      return;
    }
    wrap.classList.remove("hidden");
    track.innerHTML = cards
      .map(
        (item, index) => `
        <button class="cat-card" type="button" data-home-card="${item.id}">
          <img src="${escapeHtml(item.image)}" alt="">
        </button>`
      )
      .join("");
    state.catIndex = Math.min(state.catIndex, cards.length - 1);
    const dir = document.documentElement.dir === "rtl" ? 1 : -1;
    track.style.transform = `translateX(${state.catIndex * 100 * dir}%)`;
  }

  function moveHomeCard(step) {
    const cards = (state.homeCards || []).filter((item) => item.image);
    if (cards.length < 2) return;
    state.catIndex = (state.catIndex + step + cards.length) % cards.length;
    const track = $("#catTrack");
    if (!track) return;
    const dir = document.documentElement.dir === "rtl" ? 1 : -1;
    track.style.transform = `translateX(${state.catIndex * 100 * dir}%)`;
  }

  function renderStories() {
    const row = $("#homeStories");
    if (!row) return;
    const now = Date.now();
    const items = (state.stories || []).filter((item) => item.expires > now && item.media);
    if (!items.length) {
      row.classList.add("hidden");
      row.innerHTML = "";
      return;
    }
    row.classList.remove("hidden");
    row.innerHTML = items
      .map(
        (item, index) => `
        <button class="story-dot" type="button" data-story="${index}">
          <span><img src="${escapeHtml(item.cover || item.media)}" alt=""></span>
          <b>${escapeHtml(item.title || "")}</b>
        </button>`
      )
      .join("");
  }

  function openStory(index) {
    const now = Date.now();
    const items = (state.stories || []).filter((item) => item.expires > now && item.media);
    const item = items[index];
    const view = $("#storyView");
    const stage = $("#storyStage");
    if (!item || !view || !stage) return;
    view.classList.remove("hidden");
    $("#storyBars").innerHTML = items.map((_, i) => `<i class="${i === index ? "on" : ""}"></i>`).join("");
    stage.innerHTML = item.type === "video"
      ? `<video src="${escapeHtml(item.media)}" autoplay playsinline controls></video>`
      : `<img src="${escapeHtml(item.media)}" alt="">`;
  }

  function renderHomeAdmin() {
    fillCategoryLists();
    const productBox = $("#homeCardProducts");
    if (productBox) {
      productBox.innerHTML = state.products
        .map(
          (item) => `
          <label>
            <input type="checkbox" value="${item.id}">
            ${escapeHtml(item.name)}
          </label>`
        )
        .join("");
    }
    const cardAdmin = $("#homeCardAdmin");
    if (cardAdmin) {
      cardAdmin.innerHTML = (state.homeCards || [])
        .map(
          (item) => `
          <div class="item">
            <img src="${escapeHtml(item.image)}" alt="">
            <div>
              <h4>${escapeHtml(item.category || "کارت")}</h4>
              <small>${(item.ids || []).length} محصول</small>
            </div>
            <button class="btn ghost tiny" type="button" data-del-card="${item.id}">حذف</button>
          </div>`
        )
        .join("");
    }
    const storyAdmin = $("#storyAdmin");
    if (storyAdmin) {
      const now = Date.now();
      storyAdmin.innerHTML = (state.stories || [])
        .filter((item) => item.expires > now)
        .map(
          (item) => `
          <div class="item">
            <img src="${escapeHtml(item.cover || item.media)}" alt="">
            <div><small>تا ${new Date(item.expires).toLocaleString("fa-IR")}</small></div>
            <button class="btn ghost tiny" type="button" data-del-story="${item.id}">حذف</button>
          </div>`
        )
        .join("");
    }
  }

  async function loadHomeExtras() {
    try {
      const localCards = JSON.parse(localStorage.getItem("drup-shop-cards") || "[]");
      const localStories = JSON.parse(localStorage.getItem("drup-shop-stories") || "[]");
      if (Array.isArray(localCards)) state.homeCards = localCards;
      if (Array.isArray(localStories)) state.stories = localStories;
    } catch {}
    const cards = await db.from("shop_cards").select("*").order("id", { ascending: false });
    if (cards.data) {
      state.homeCards = cards.data.map((row) => ({
        id: String(row.id),
        image: row.image_url,
        category: row.category || "",
        ids: String(row.product_ids || "").split(",").filter(Boolean),
      }));
    }
    const stories = await db.from("shop_stories").select("*").order("id", { ascending: false });
    if (stories.data) {
      state.stories = stories.data.map((row) => ({
        id: String(row.id),
        media: row.media_url,
        cover: row.cover_url || "",
        type: row.media_type || "image",
        title: row.title || "",
        expires: new Date(row.expires_at).getTime(),
      }));
    }
    const expired = (state.stories || []).filter((item) => item.expires <= Date.now());
    state.stories = (state.stories || []).filter((item) => item.expires > Date.now());
    if (expired.length) {
      await db.from("shop_stories").delete().lte("expires_at", new Date().toISOString());
    }
    localStorage.setItem("drup-shop-cards", JSON.stringify(state.homeCards));
    localStorage.setItem("drup-shop-stories", JSON.stringify(state.stories));
    renderHomeCards();
    renderStories();
    renderHomeAdmin();
  }

  async function saveHomeCard(event) {
    event.preventDefault();
    if (!state.session) return;
    const file = $("#homeCardFile")?.files?.[0];
    if (!file) {
      showToast("تصویر کارت را انتخاب کنید.", "error");
      return;
    }
    showToast("در حال آپلود تصویر کارت...", "success", 0);
    const image = await uploadProductImage(file);
    const ids = $$("#homeCardProducts input:checked").map((input) => input.value);
    const category = ($("#homeCardCategory")?.value || "").trim();
    const row = { image_url: image, category, product_ids: ids.join(",") };
    const { data } = await db.from("shop_cards").insert(row).select("id").limit(1);
    state.homeCards.unshift({
      id: String(data?.[0]?.id || Date.now()),
      image,
      category,
      ids,
    });
    localStorage.setItem("drup-shop-cards", JSON.stringify(state.homeCards));
    $("#homeCardForm").reset();
    renderHomeCards();
    renderHomeAdmin();
    showToast("کارت ذخیره شد ✓", "success");
  }

  async function saveStory(event) {
    event.preventDefault();
    if (!state.session) return;
    const file = $("#storyFile")?.files?.[0];
    if (!file) {
      showToast("فایل استوری را انتخاب کنید.", "error");
      return;
    }
    showToast("در حال آپلود استوری...", "success", 0);
    const media = await uploadProductImage(file);
    const coverFile = $("#storyCover")?.files?.[0];
    const cover = coverFile ? await uploadProductImage(coverFile) : "";
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const type = file.type.startsWith("video/") ? "video" : "image";
    const title = ($("#storyTitle")?.value || "").trim();
    let inserted = await db
      .from("shop_stories")
      .insert({ media_url: media, cover_url: cover, media_type: type, expires_at: expires, title })
      .select("id")
      .limit(1);
    if (inserted.error) {
      inserted = await db
        .from("shop_stories")
        .insert({ media_url: media, cover_url: cover, media_type: type, expires_at: expires })
        .select("id")
        .limit(1);
    }
    const data = inserted.data;
    state.stories.unshift({
      id: String(data?.[0]?.id || Date.now()),
      media,
      cover,
      type,
      title,
      expires: Date.parse(expires),
    });
    localStorage.setItem("drup-shop-stories", JSON.stringify(state.stories));
    $("#storyForm").reset();
    renderStories();
    renderHomeAdmin();
    showToast("استوری ذخیره شد ✓", "success");
  }

  async function loadPaySettings() {
    try {
      const local = JSON.parse(localStorage.getItem(PAY_KEY) || "null");
      if (
        local?.cardNumber &&
        local?.cardHolder &&
        local.cardNumber !== "6219861958171885"
      ) {
        state.pay = local;
      }
    } catch {}

    const { data } = await db
      .from("shop_settings")
      .select("*")
      .order("id", { ascending: false })
      .limit(1);
    const row = data?.[0];
    if (row?.card_number && row?.card_holder) {
      state.pay = {
        cardNumber: String(row.card_number).replace(/[^\d]/g, ""),
        cardHolder: row.card_holder,
      };
    }

    applyPayInfo();
  }

  async function savePaySettings(event) {
    event.preventDefault();
    if (!state.session) {
      showToast("ابتدا وارد پنل مدیریت شوید.", "error");
      return;
    }

    const cardNumber = $("#cardNumber").value.replace(/[^\d]/g, "");
    const cardHolder = $("#cardHolder").value.trim();

    if (cardNumber.length < 16 || !cardHolder) {
      showToast("شماره کارت و نام را کامل وارد کنید.", "error");
      return;
    }

    state.pay = { cardNumber, cardHolder };
    localStorage.setItem(PAY_KEY, JSON.stringify(state.pay));
    applyPayInfo();

    let { error } = await db
      .from("shop_settings")
      .update({
        card_number: cardNumber,
        card_holder: cardHolder,
      })
      .not("id", "is", null);

    if (error) {
      ({ error } = await db.from("shop_settings").insert({
        card_number: cardNumber,
        card_holder: cardHolder,
      }));
    }

    if (error) {
      showToast("ذخیره در سرور انجام نشد. سیاست جدول را بررسی کنید.", "error");
      return;
    }

    showToast("اطلاعات کارت ذخیره شد.", "success");
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString("fa-IR");
  }

  function formatCode(value) {
    return String(value || "").padStart(10, "0");
  }

  function createProductCode() {
    return String(Math.floor(1000000000 + Math.random() * 9000000000));
  }

  function showToast(message, type, duration) {
    const toast = $("#toast");
    const text = toast.querySelector(".toast-text") || toast;
    const inferred =
      type ||
      (/نشد|نادرست|خطا|ضروری|انتخاب کنید/.test(message) ? "error" : "success");

    text.textContent = message;
    toast.classList.remove("show", "hide", "success", "error");
    void toast.offsetWidth;
    toast.classList.add(inferred, "show");

    clearTimeout(showToast.timer);
    if (duration === 0) return;
    showToast.timer = setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.add("hide");
    }, duration || 2500);
  }

  function openOverlay(id) {
    $(`#${id}`).classList.add("open");
  }

  function closeOverlay(id) {
    $(`#${id}`).classList.remove("open");
  }

  function fallbackImage(name) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
        <rect width="800" height="600" fill="#0b1b36"/>
        <text x="400" y="310" font-size="36" text-anchor="middle" fill="white">
          ${escapeHtml(name)}
        </text>
      </svg>
    `;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function parseCovers(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return String(value)
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function takeBlock(text, name) {
    const match = String(text || "").match(
      new RegExp(`\\[\\[${name}\\]\\]([\\s\\S]*?)\\[\\[\\/${name}\\]\\]`)
    );
    if (!match) return { text: String(text || ""), items: [] };
    return {
      text: String(text || "").replace(match[0], "").trim(),
      items: parseCovers(match[1]),
    };
  }

  function splitSpecs(raw) {
    const covers = takeBlock(raw, "COVERS");
    const videos = takeBlock(covers.text, "VIDEOS");
    const gallery = takeBlock(videos.text, "GALLERY");
    const slugBlock = String(gallery.text || "").match(/\[\[SLUG\]\]([\s\S]*?)\[\[\/SLUG\]\]/);
    let rest = slugBlock ? gallery.text.replace(slugBlock[0], "").trim() : gallery.text;
    const catBlock = String(rest || "").match(/\[\[CATEGORY\]\]([\s\S]*?)\[\[\/CATEGORY\]\]/);
    return {
      specs: catBlock ? rest.replace(catBlock[0], "").trim() : rest,
      covers: covers.items,
      videos: videos.items,
      gallery: gallery.items,
      slug: slugBlock ? slugBlock[1].trim() : "",
      category: catBlock ? catBlock[1].trim() : "",
    };
  }

  function embedCovers(specs, covers, videos = [], gallery = [], slug = "") {
    let clean = String(specs || "")
      .replace(/\[\[COVERS\]\][\s\S]*?\[\[\/COVERS\]\]/g, "")
      .replace(/\[\[VIDEOS\]\][\s\S]*?\[\[\/VIDEOS\]\]/g, "")
      .replace(/\[\[GALLERY\]\][\s\S]*?\[\[\/GALLERY\]\]/g, "")
      .replace(/\[\[SLUG\]\][\s\S]*?\[\[\/SLUG\]\]/g, "")
      .replace(/\[\[CATEGORY\]\][\s\S]*?\[\[\/CATEGORY\]\]/g, "")
      .trim();
    if (slug) clean = `[[SLUG]]\n${slug}\n[[/SLUG]]\n${clean}`;
    const category = arguments[5] || "";
    if (category) clean = `[[CATEGORY]]\n${category}\n[[/CATEGORY]]\n${clean}`;
    if (covers.length) clean = `[[COVERS]]\n${covers.join("\n")}\n[[/COVERS]]\n${clean}`;
    if (gallery.length) clean = `[[GALLERY]]\n${gallery.join("\n")}\n[[/GALLERY]]\n${clean}`;
    if (videos.length) clean = `[[VIDEOS]]\n${videos.join("\n")}\n[[/VIDEOS]]\n${clean}`;
    return clean;
  }

  const STABLE_SLUGS = {
    "123364c0-f8b4-4737-bab5-c07b945fd7f6": "mini-projector",
    "943ac59a-e29c-42db-a721-367fa607c5f1": "galaxy-night-light",
    "c25d79fa-b840-453d-9911-6c90cfba55a1": "magnetic-globe",
    "053eef2f-98c7-4f48-8b7e-2a3aaaaa715e": "popcorn-maker",
    "03835055-439b-4772-b73d-beaad5a0c13e": "smart-comb",
    "2207f101-9814-4f74-8d05-b78c0f668ebd": "clothes-rack",
    "154adc4b-e253-4554-b5f8-324fe263fa9d": "neck-massager",
  };

  function productSlug(product) {
    const stored = String(product.slug || "").trim();
    if (stored) return stored;
    if (STABLE_SLUGS[product.id]) return STABLE_SLUGS[product.id];
    const code = String(product.code || "").replace(/\D/g, "");
    return code ? `p-${code}` : `p-${String(product.id).slice(0, 8)}`;
  }

  function mapProduct(product) {
    const split = splitSpecs(product.specs);
    const storedCovers = parseCovers(product.cover_url);
    const covers = [...split.covers, storedCovers[0]].filter(
      (url, index, list) => url && list.indexOf(url) === index
    );
    const gallery = [
      ...split.gallery,
      product.image_url || "",
      ...storedCovers.slice(1),
    ].filter((url, index, list) => url && list.indexOf(url) === index && url !== covers[0]);
    const videos = split.videos.slice(0, 3);

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      desc: product.description,
      specs: split.specs,
      slug: split.slug || STABLE_SLUGS[product.id] || "",
      category: split.category || "",
      image: product.image_url || gallery[0] || "",
      covers,
      gallery,
      videos,
      stock: product.stock,
      code: String(product.product_code || ""),
      createdAt: product.created_at || "",
      sortOrder: product.sort_order ?? 0,
    };
  }

  function setupPriceAxis() {
    const prices = state.products.map((item) => Number(item.price) || 0);
    const lowest = prices.length ? Math.min(...prices) : 0;
    const highest = prices.length ? Math.max(...prices) : 30000000;
    const axisMin = Math.max(0, Math.min(lowest, 500000));
    const axisMax = Math.max(highest, 500000);

    state.axisMin = axisMin;
    state.axisMax = axisMax;
    state.priceMin = axisMin;
    state.priceMax = axisMax;

    const minInput = $("#priceMin");
    const maxInput = $("#priceMax");
    if (!minInput || !maxInput) return;

    [minInput, maxInput].forEach((input) => {
      input.min = String(axisMin);
      input.max = String(axisMax);
      input.step = String(axisMax - axisMin > 2000000 ? 50000 : 10000);
    });

    minInput.value = String(axisMin);
    maxInput.value = String(axisMax);

    syncPriceAxis();
  }

  function syncPriceAxis() {
    const minInput = $("#priceMin");
    const maxInput = $("#priceMax");
    let minVal = Number(minInput.value);
    let maxVal = Number(maxInput.value);

    if (minVal > maxVal) {
      const swap = minVal;
      minVal = maxVal;
      maxVal = swap;
      minInput.value = String(minVal);
      maxInput.value = String(maxVal);
    }

    state.priceMin = minVal;
    state.priceMax = maxVal;

    $("#priceMinLabel").textContent = formatPrice(minVal);
    $("#priceMaxLabel").textContent = formatPrice(maxVal);

    const minBox = $("#priceMinBox");
    const maxBox = $("#priceMaxBox");
    if (minBox && document.activeElement !== minBox) minBox.value = String(minVal);
    if (maxBox && document.activeElement !== maxBox) maxBox.value = String(maxVal);

    const span = Math.max(1, state.axisMax - state.axisMin);
    const start = ((minVal - state.axisMin) / span) * 100;
    const end = ((maxVal - state.axisMin) / span) * 100;
    const fill = $("#rangeFill");
    fill.style.left = `${start}%`;
    fill.style.width = `${Math.max(0, end - start)}%`;
  }

  async function loadProducts() {
    const grid = $("#productGrid");
    grid.innerHTML = `
      <div class="empty">
        در حال دریافت محصولات...
      </div>
    `;

    const { data, error } = await db
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      grid.innerHTML = `
        <div class="empty">
          دریافت محصولات انجام نشد. اینترنت و تنظیمات سایت را بررسی کنید.
        </div>
      `;
      return;
    }

    state.products = (data || []).map(mapProduct);
    setupPriceAxis();
    renderStore($("#publicSearch").value);
    renderAdmin();
  }

  function renderStore(filter = "") {
    const grid = $("#productGrid");
    const query = (filter ?? $("#publicSearch")?.value ?? "").trim();

    const products = state.products
      .filter((product) => {
        const price = Number(product.price) || 0;
        const inRange = price >= state.priceMin && price <= state.priceMax;
        const matchesQuery =
          !query ||
          product.name.includes(query) ||
          product.code.includes(query) ||
          formatCode(product.code).includes(query) ||
          product.desc.includes(query) ||
          (product.category || "").includes(query);
        const card = state.cardFilter;
        const matchesCard =
          !card ||
          ((!card.ids || !card.ids.length) && !card.category) ||
          (card.ids || []).includes(product.id) ||
          (card.category && product.category === card.category);
        return inRange && matchesQuery && matchesCard;
      })
      .sort((a, b) => {
        if (state.sort === "expensive") return Number(b.price) - Number(a.price);
        if (state.sort === "cheap") return Number(a.price) - Number(b.price);
        if (state.sort === "new") {
          return String(b.createdAt).localeCompare(String(a.createdAt));
        }
        if (state.sort === "old") {
          return String(a.createdAt).localeCompare(String(b.createdAt));
        }
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });

    if (!products.length) {
      grid.innerHTML = `
        <div class="empty">
          محصولی برای نمایش پیدا نشد.
        </div>
      `;
      renderPager(0);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(products.length / state.perPage));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    const start = (state.page - 1) * state.perPage;
    const pageItems = products.slice(start, start + state.perPage);

    grid.innerHTML = pageItems
      .map((product) => {
        const isAvailable = product.stock === "in";
        const listImage = product.covers[0] || product.image || fallbackImage(product.name);
        const image = escapeHtml(listImage);
        const fallback = fallbackImage(product.name);

        return `
          <article class="card fade-wait" data-detail="${product.id}">
            <div class="media">
              <img
                src="${image}"
                alt="تصویر ${escapeHtml(product.name)} در فروشگاه دراپ شاپ"
                loading="lazy"
                onerror="this.onerror=null;this.src='${fallback}'"
              >
              <span class="badge ${isAvailable ? "in" : "out"}">
                ${isAvailable ? "موجود" : "ناموجود"}
              </span>
            </div>
            <div class="body">
              <h3>${escapeHtml(product.name)}</h3>
              <div class="price">
                ${formatPrice(product.price)}
                <small>تومان</small>
              </div>
              <p class="desc">${escapeHtml(product.desc)}</p>
              <button
                class="btn primary full"
                type="button"
                data-order="${product.id}"
                ${isAvailable ? "" : "disabled"}
              >
                ${isAvailable ? "ثبت سفارش" : "فعلاً ناموجود"}
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    const cards = $$("#productGrid .card");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        const index = cards.indexOf(card);
        card.style.animationDelay = `${index * 90}ms`;
        card.classList.add("fade-in");
        io.unobserve(card);
      });
    }, { threshold: 0.2 });
    cards.forEach((card) => io.observe(card));

    renderPager(totalPages);
  }

  function renderPager(totalPages) {
    const pager = $("#productPager");
    if (!pager) return;

    if (!totalPages || totalPages <= 1) {
      pager.innerHTML = "";
      return;
    }

    const buttons = [];
    buttons.push(
      `<button class="page-btn" type="button" data-page="${state.page - 1}" ${
        state.page === 1 ? "disabled" : ""
      }>قبلی</button>`
    );

    for (let page = 1; page <= totalPages; page += 1) {
      buttons.push(
        `<button class="page-btn ${page === state.page ? "active" : ""}" type="button" data-page="${page}">${page}</button>`
      );
    }

    buttons.push(
      `<button class="page-btn" type="button" data-page="${state.page + 1}" ${
        state.page === totalPages ? "disabled" : ""
      }>بعدی</button>`
    );

    pager.innerHTML = `<div class="pager-in">${buttons.join("")}</div>`;
  }

  function goToStorePage(page) {
    const next = Number(page);
    if (!next || next === state.page) return;
    state.page = next;
    renderStore();
    $("#products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderAdmin() {
    const list = $("#adminList");
    if (!state.session) {
      list.innerHTML = "";
      return;
    }
    renderHomeAdmin();

    if (!state.products.length) {
      list.innerHTML = `
        <div class="empty">
          هنوز محصولی ثبت نشده است.
        </div>
      `;
      return;
    }

    list.innerHTML = state.products
      .map((product) => {
        const image = escapeHtml(product.image || fallbackImage(product.name));
        return `
          <div class="item">
            <img src="${image}" alt="">
            <div>
              <h4>${escapeHtml(product.name)}</h4>
              <small>
                کد ${formatCode(product.code)}
                · ${formatPrice(product.price)} تومان
                · ${product.stock === "in" ? "موجود" : "ناموجود"}
              </small>
            </div>
            <div class="actions">
              <button class="btn ghost tiny" type="button" data-edit="${product.id}">ویرایش</button>
              <button class="btn danger tiny" type="button" data-delete="${product.id}">حذف</button>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function resetProductForm() {
    $("#productForm").reset();
    $("#editId").value = "";
    $("#formTitle").textContent = "افزودن محصول";
    $("#saveBtn").textContent = "ثبت محصول";
    const preview = $("#pPreview");
    preview.removeAttribute("src");
    preview.classList.add("hidden");
    state.formCovers = [];
    state.formImages = [];
    state.formVideos = [];
    state.pendingMedia = {};
    ["pFile", "pCoverFile", "pVideoFile"].forEach((id) => {
      if ($(`#${id}`)) $(`#${id}`).value = "";
    });
    const coverPreview = $("#pCoverPreview");
    const imagePreview = $("#pImagePreview");
    const videoPreview = $("#pVideoPreview");
    if (coverPreview) coverPreview.innerHTML = "";
    if (imagePreview) imagePreview.innerHTML = "";
    if (videoPreview) videoPreview.innerHTML = "";
  }

  function renderCoverPreview(urls = state.formCovers) {
    renderMediaPreview("#pCoverPreview", urls, false, "formCovers");
  }

  function renderMediaPreview(selector, urls = [], isVideo = false, listKey = "") {
    const box = $(selector);
    if (!box) return;
    box.innerHTML = urls
      .filter(Boolean)
      .map((url) => `
        <div class="media-thumb">
          ${
            isVideo
              ? `<video src="${escapeHtml(url)}" muted playsinline></video>`
              : `<img src="${escapeHtml(url)}" alt="">`
          }
          <button type="button" data-remove-media="${listKey}" data-url="${encodeURIComponent(url)}" aria-label="حذف">×</button>
        </div>
      `)
      .join("");
  }

  function setPreview(url) {
    const preview = $("#pPreview");
    if (!url) {
      preview.removeAttribute("src");
      preview.classList.add("hidden");
      return;
    }
    preview.src = url;
    preview.classList.remove("hidden");
  }

  function fillProductForm(product) {
    $("#editId").value = product.id;
    $("#pName").value = product.name;
    if ($("#pCategory")) $("#pCategory").value = product.category || "";
    $("#pPrice").value = product.price;
    $("#pDesc").value = product.desc;
    $("#pSpecs").value = product.specs;
    $("#pImage").value = product.image || product.gallery?.[0] || "";
    $("#pCover").value = product.covers[0] || "";
    state.formCovers = [...(product.covers || [])];
    state.formImages = [...(product.gallery || [])];
    if (product.image && !state.formImages.includes(product.image) && product.image !== product.covers[0]) {
      state.formImages.unshift(product.image);
    }
    state.formVideos = [...(product.videos || [])].slice(0, 3);
    if ($("#pVideo")) $("#pVideo").value = "";
    renderCoverPreview();
    renderMediaPreview("#pImagePreview", state.formImages, false, "formImages");
    renderMediaPreview("#pVideoPreview", state.formVideos, true, "formVideos");
    $("#pStock").value = product.stock;
    $("#formTitle").textContent = "ویرایش محصول";
    $("#saveBtn").textContent = "ذخیره تغییرات";
    setPreview(product.image || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function productPath(product) {
    return `/products/${productSlug(product)}`;
  }

  function setMeta(selector, attr, value) {
    const tag = document.querySelector(selector);
    if (tag && value) tag.setAttribute(attr, value);
  }

  function applyProductSeo(product) {
    const origin = window.location.origin;
    const url = origin + productPath(product);
    const title = `${product.name} | دراپ شاپ`;
    const desc = String(product.desc || product.specs || product.name).replace(/\s+/g, " ").trim().slice(0, 160);
    const image = product.image || product.covers[0] || origin + "/assets/img/site-bg.jpg";
    document.title = title;
    setMeta('meta[name="description"]', "content", desc);
    setMeta("#canonicalUrl", "href", url);
    setMeta('meta[property="og:type"]', "content", "product");
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", desc);
    setMeta('meta[name="twitter:image"]', "content", image);

    const data = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      url,
    };
    if (product.desc) data.description = product.desc;
    if (product.image || product.covers[0]) data.image = product.image || product.covers[0];
    if (product.code) data.sku = formatCode(product.code);
    if (product.price) {
      data.offers = {
        "@type": "Offer",
        price: String(product.price),
        priceCurrency: "IRR",
        availability:
          product.stock === "in"
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        url,
      };
    }
    let node = document.getElementById("productJsonLd");
    if (!node) {
      node = document.createElement("script");
      node.type = "application/ld+json";
      node.id = "productJsonLd";
      document.head.appendChild(node);
    }
    node.textContent = JSON.stringify(data);
  }

  function clearProductSeo() {
    document.title = "دراپ شاپ | خرید آنلاین گجت و محصولات منتخب";
    const node = document.getElementById("productJsonLd");
    if (node) node.remove();
    setMeta('meta[property="og:type"]', "content", "website");
  }

  function findProductFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const byId = params.get("product");
    if (byId) {
      return state.products.find((item) => String(item.id) === String(byId));
    }
    const match = window.location.pathname.match(/\/products\/([^/]+)\/?$/);
    if (!match) return null;
    const slug = decodeURIComponent(match[1]);
    return state.products.find((item) => {
      const current = productSlug(item);
      return current === slug || String(item.code) === slug || String(item.id) === slug;
    });
  }

  function openProductDetail(product) {
    const path = productPath(product);
    if (window.location.pathname !== path) {
      history.replaceState({}, "", path);
    }
    showProductPage(product);
  }

  function setStorefrontVisible(show) {
    $("main.storefront")?.classList.toggle("hidden", !show);
    $("footer.storefront")?.classList.toggle("hidden", !show);
    $("#productPage")?.classList.add("hidden");
    $("#reviewsPage")?.classList.add("hidden");
    $("#customersPage")?.classList.add("hidden");
  }

  function showReviewsPage() {
    setStorefrontVisible(false);
    $("#reviewsPage")?.classList.remove("hidden");
    renderReviews();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function closeProductPage() {
    const stage = $("#galleryStage");
    const video = stage?.querySelector("video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
    }
    $("#productPage")?.classList.add("hidden");
    $("main.storefront")?.classList.remove("hidden");
    $("footer.storefront")?.classList.remove("hidden");
    clearProductSeo();
  }

  function productGalleryItems(product) {
    const cover = product.covers[0] || "";
    const images = [...(product.gallery || []), product.image].filter(
      (url, index, list) => url && url !== cover && list.indexOf(url) === index
    );
    const videos = (product.videos || []).slice(0, 3);
    const items = [
      ...images.map((src) => ({ type: "image", src })),
      ...videos.map((src) => ({ type: "video", src })),
    ];
    if (!items.length) items.push({ type: "image", src: fallbackImage(product.name) });
    return items;
  }

  function renderGallery() {
    const item = state.gallery[state.galleryIndex];
    const stage = $("#galleryStage");
    if (!item || !stage) return;
    const src = escapeHtml(item.src);
    stage.innerHTML =
      item.type === "video"
        ? `<video src="${src}" controls playsinline preload="metadata"></video>`
        : `<img src="${src}" alt="${escapeHtml(state.galleryAlt || "تصویر محصول دراپ شاپ")}">`;
    $$("#galleryDots button").forEach((dot, index) => {
      dot.classList.toggle("active", index === state.galleryIndex);
    });
  }

  function showProductPage(product) {
    const isAvailable = product.stock === "in";
    state.gallery = productGalleryItems(product);
    state.galleryIndex = 0;
    state.galleryAlt = `تصویر ${product.name} در فروشگاه دراپ شاپ`;
    applyProductSeo(product);

    $("main.storefront")?.classList.add("hidden");
    $("footer.storefront")?.classList.add("hidden");
    $("#productPage")?.classList.remove("hidden");

    $("#pageName").textContent = product.name;
    const cat = $("#pageCategory");
    if (cat) {
      cat.textContent = product.category || "";
      cat.classList.toggle("hidden", !product.category);
    }
    $("#pagePrice").innerHTML = `${formatPrice(product.price)} <small>تومان</small>`;
    $("#pageDesc").textContent = product.desc || "";
    $("#pageSpecs").textContent = product.specs || "";
    $("#pageCode").textContent = formatCode(product.code);
    const stock = $("#pageStock");
    stock.className = `badge ${isAvailable ? "in" : "out"}`;
    stock.textContent = isAvailable ? "موجود" : "ناموجود";
    $("#pageCopy").dataset.copy = formatCode(product.code);
    const orderBtn = $("#pageOrder");
    orderBtn.dataset.order = product.id;
    orderBtn.disabled = !isAvailable;
    orderBtn.textContent = isAvailable ? "ثبت سفارش" : "فعلاً ناموجود";

    $("#galleryDots").innerHTML = state.gallery
      .map((_, index) => `<button type="button" data-gallery="${index}"></button>`)
      .join("");
    renderGallery();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  const DEFAULT_REVIEWS = [
    { id: "r1", name: "سارا محمدی", text: "سفارش سریع رسید و کیفیت محصول دقیقاً مطابق عکس بود.", rate: 5 },
    { id: "r2", name: "علی رضایی", text: "پشتیبانی خوب بود و کد محصول را راحت از سایت برداشتم.", rate: 5 },
    { id: "r3", name: "نگار احمدی", text: "بسته‌بندی مرتب بود. خرید بعدی را هم از دراپ شاپ می‌گیرم.", rate: 4 },
    { id: "r4", name: "حسین کاظمی", text: "قیمت شفاف بود و بدون سبد خرید پیچیده سفارش دادم.", rate: 5 },
  ];

  function renderReviews() {
    const grid = $("#reviewGrid");
    const adminList = $("#reviewAdminList");
    if (grid) {
      grid.innerHTML = state.reviews
        .map(
          (item) => `
            <article class="review-card">
              <strong>${escapeHtml(item.name)}</strong>
              <div class="stars">${"★".repeat(Number(item.rate) || 5)}${"☆".repeat(Math.max(0, 5 - (Number(item.rate) || 5)))}</div>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `
        )
        .join("");
    }
    if (adminList && state.session) {
      adminList.innerHTML = state.reviews
        .map(
          (item) => `
            <div class="item">
              <div></div>
              <div>
                <h4>${escapeHtml(item.name)}</h4>
                <small>${escapeHtml(item.text)}</small>
              </div>
              <div class="actions">
                <button class="btn ghost tiny" type="button" data-review-edit="${item.id}">ویرایش</button>
                <button class="btn danger tiny" type="button" data-review-delete="${item.id}">حذف</button>
              </div>
            </div>
          `
        )
        .join("");
    }
  }

  async function loadReviews() {
    try {
      const local = JSON.parse(localStorage.getItem("drup-shop-reviews") || "null");
      state.reviews = Array.isArray(local) && local.length ? local : DEFAULT_REVIEWS;
    } catch {
      state.reviews = DEFAULT_REVIEWS;
    }
    const { data } = await db.from("shop_reviews").select("*").order("id", { ascending: true });
    if (data?.length) {
      state.reviews = data.map((row) => ({
        id: String(row.id),
        name: row.name,
        text: row.text,
        rate: Number(row.rate) || 5,
      }));
    }
    renderReviews();
  }

  function resetReviewForm() {
    $("#reviewForm")?.reset();
    if ($("#reviewId")) $("#reviewId").value = "";
  }

  async function addReview(name, text, rate, id = "") {
    const reviewId = id || `r${Date.now()}`;
    const current = state.reviews.find((item) => item.id === reviewId);
    if (current) {
      current.name = name;
      current.text = text;
      current.rate = rate;
    } else {
      state.reviews.unshift({ id: reviewId, name, text, rate });
    }
    localStorage.setItem("drup-shop-reviews", JSON.stringify(state.reviews));
    await db.from("shop_reviews").insert({ name, text, rate });
    renderReviews();
  }

  async function savePublicReview(event) {
    event.preventDefault();
    const name = $("#publicReviewName").value.trim();
    const text = $("#publicReviewText").value.trim();
    const rate = Number($("#publicReviewRate").value);
    if (!name || !text) {
      showToast("نام و متن نظر را کامل کنید.", "error");
      return;
    }
    if (!rate) {
      showToast("امتیاز ستاره‌ای را انتخاب کنید.", "error");
      return;
    }
    await addReview(name, text, rate);
    $("#publicReviewForm").reset();
    $("#publicReviewRate").value = "0";
    $$("#publicStars [data-star]").forEach((star) => {
      star.textContent = "☆";
      star.classList.remove("on");
    });
    showToast("نظر شما ثبت شد.", "success");
  }

  async function saveReview(event) {
    event.preventDefault();
    if (!state.session) return;
    const id = $("#reviewId").value || `r${Date.now()}`;
    const name = $("#reviewName").value.trim();
    const text = $("#reviewText").value.trim();
    const rate = Number($("#reviewRate").value) || 5;
    if (!name || !text) {
      showToast("نام و متن نظر را کامل کنید.", "error");
      return;
    }
    await addReview(name, text, rate, id);
    resetReviewForm();
    showToast("نظر ذخیره شد.", "success");
  }

  function normalizePhone(value) {
    return String(value || "")
      .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
      .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
      .replace(/[^\d]/g, "");
  }

  function isValidPhone(value) {
    return /^09\d{9}$/.test(normalizePhone(value));
  }

  function renderCustomers() {
    const list = $("#customerList");
    if (!list) return;
    if (!state.customers.length) {
      list.innerHTML = `<div class="empty">هنوز مشتری ثبت نشده است.</div>`;
      return;
    }
    list.innerHTML = state.customers
      .map(
        (item) => `
          <div class="item">
            <div></div>
            <div>
              <h4>${escapeHtml(item.name)}</h4>
              <small dir="ltr">${escapeHtml(item.phone)}</small>
            </div>
          </div>
        `
      )
      .join("");
  }

  async function loadCustomers() {
    try {
      const local = JSON.parse(localStorage.getItem("drup-shop-customers") || "[]");
      if (Array.isArray(local)) state.customers = local;
    } catch {
      state.customers = [];
    }
    const { data } = await db.from("shop_customers").select("*").order("id", { ascending: false });
    if (data?.length) {
      state.customers = data.map((row) => ({
        id: String(row.id),
        name: row.name,
        phone: row.phone,
      }));
    }
    renderCustomers();
  }

  async function saveCustomer(event) {
    event.preventDefault();
    const name = $("#signupName").value.trim();
    const phone = normalizePhone($("#signupPhone").value);
    $("#signupPhone").value = phone;
    if (!name) {
      showToast("نام و نام خانوادگی را وارد کنید.", "error");
      return;
    }
    if (!isValidPhone(phone)) {
      $("#signupPhoneError")?.classList.remove("hidden");
      showToast("شماره تماس باید ۱۱ رقم و مثل 09918760129 باشد.", "error");
      return;
    }
    const row = { id: `c${Date.now()}`, name, phone };
    state.customers.unshift(row);
    localStorage.setItem("drup-shop-customers", JSON.stringify(state.customers));
    await db.from("shop_customers").insert({ name, phone });
    $("#signupForm").reset();
    closeOverlay("signupOverlay");
    renderCustomers();
    showToast("ثبت‌نام با موفقیت انجام شد ✓", "success");
  }

  function showCustomersPage() {
    if (!state.session) return;
    showAdmin(false);
    setStorefrontVisible(false);
    $("#customersPage")?.classList.remove("hidden");
    renderCustomers();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function applyPriceBox(which) {
    const minInput = $("#priceMin");
    const maxInput = $("#priceMax");
    const minBox = $("#priceMinBox");
    const maxBox = $("#priceMaxBox");
    if (!minInput || !maxInput || !minBox || !maxBox) return;

    const raw = which === "min" ? minBox.value : maxBox.value;
    const value = Number(String(raw).replace(/[^\d]/g, ""));
    if (!value && value !== 0) return;

    const clamped = Math.min(
      Number(maxInput.max),
      Math.max(Number(minInput.min), value)
    );

    if (which === "min") minInput.value = String(clamped);
    else maxInput.value = String(clamped);

    syncPriceAxis();
    state.page = 1;
    renderStore();
  }

  function showAdmin(show) {
    const storefrontItems = $$(".storefront");
    const adminShell = $("#adminShell");
    storefrontItems.forEach((element) => {
      element.classList.toggle("locked", show);
    });
    adminShell.classList.toggle("open", show);
    if (show) renderAdmin();
  }

  function fileExtension(file) {
    return String(file?.name || "").split(".").pop()?.toLowerCase() || "";
  }

  function isVideoFile(file) {
    const ext = fileExtension(file);
    return file.type.startsWith("video/") || ["mp4", "webm", "ogg", "ogv", "mov", "m4v", "mkv"].includes(ext);
  }

  function isImageFile(file) {
    const ext = fileExtension(file);
    return file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  }

  async function uploadProductImage(file) {
    if (!file) return null;

    const isVideo = isVideoFile(file);
    const isImage = isImageFile(file);
    if (!isImage && !isVideo) {
      throw new Error("لطفاً فقط فایل تصویر یا ویدیو انتخاب کنید.");
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      throw new Error("حجم تصویر باید کمتر از ۵ مگابایت باشد.");
    }

    if (isVideo && file.size > 120 * 1024 * 1024) {
      throw new Error("حجم ویدیو خیلی زیاد است.");
    }

    let extension = fileExtension(file) || (isVideo ? "mp4" : "jpg");
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "ogg", "ogv", "mov", "m4v"];
    if (!allowedExtensions.includes(extension)) extension = isVideo ? "mp4" : "jpg";

    const types = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogg: "video/ogg",
      ogv: "video/ogg",
      mov: "video/quicktime",
      m4v: "video/mp4",
    };
    if (file.type === "video/quicktime" && !fileExtension(file)) extension = "mov";
    const contentType = file.type || types[extension] || (isVideo ? "video/mp4" : "image/jpeg");
    const filePath = `products/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await db.storage
      .from("product-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType,
      });

    if (uploadError) {
      console.error(uploadError);
      const raw = String(uploadError.message || "");
      if (/mime|not allowed|invalid/i.test(raw)) {
        throw new Error("سطل تصاویر ویدیو را قبول نمی‌کند. video/mp4 را در Storage مجاز کنید.");
      }
      throw new Error(raw || "آپلود ویدیو انجام نشد.");
    }

    const { data } = db.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function saveProduct(event) {
    event.preventDefault();

    if (!state.session) {
      showToast("ابتدا وارد پنل مدیریت شوید.", "error");
      return;
    }

    const editId = $("#editId").value;
    const saveButton = $("#saveBtn");
    const name = $("#pName").value.trim();
    const price = Number($("#pPrice").value.replace(/[^\d]/g, ""));
    const description = $("#pDesc").value.trim();
    const specs = $("#pSpecs").value.trim();
    let imageUrl = $("#pImage").value.trim();
    let coverUrl = $("#pCover")?.value.trim() || "";
    const videoUrl = $("#pVideo")?.value.trim() || "";
    const stock = $("#pStock").value;

    if (!name || !price || !description || !specs) {
      showToast("همه فیلدهای ضروری را کامل کنید.", "error");
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "در حال ذخیره...";

    try {
      async function resolveList(list) {
        const next = [];
        for (const url of list) {
          const file = state.pendingMedia[url];
          if (file) {
            showToast("در حال آپلود رسانه...", "success");
            const uploaded = await uploadProductImage(file);
            if (uploaded) next.push(uploaded);
            delete state.pendingMedia[url];
          } else if (url && !url.startsWith("blob:")) {
            next.push(url);
          }
        }
        return next;
      }

      state.formImages = await resolveList(state.formImages);
      state.formCovers = await resolveList(state.formCovers);
      state.formVideos = (await resolveList(state.formVideos)).slice(0, 3);

      if (coverUrl && !state.formCovers.includes(coverUrl)) state.formCovers.unshift(coverUrl);
      if (imageUrl && !state.formImages.includes(imageUrl)) state.formImages.unshift(imageUrl);
      if (videoUrl && !state.formVideos.includes(videoUrl)) {
        state.formVideos = [videoUrl, ...state.formVideos].slice(0, 3);
      }

      const covers = [...new Set(state.formCovers.filter((url) => url && !url.startsWith("blob:")))];
      const gallery = [...new Set(state.formImages.filter((url) => url && !url.startsWith("blob:")))];
      const videos = [...new Set(state.formVideos.filter((url) => url && !url.startsWith("blob:")))].slice(0, 3);
      imageUrl = gallery[0] || "";
      const coverValue = covers[0] || null;

      const payload = {
        name,
        price,
        description,
        specs: embedCovers(
          specs,
          covers,
          videos,
          gallery,
          productSlug({
            id: editId,
            code: editId
              ? state.products.find((item) => item.id === editId)?.code
              : "",
            slug: editId
              ? state.products.find((item) => item.id === editId)?.slug
              : "",
          }),
          ($("#pCategory")?.value || "").trim()
        ),
        image_url: imageUrl || null,
        cover_url: coverValue,
        stock,
      };

      let error;
      if (editId) {
        ({ error } = await db.from("products").update(payload).eq("id", editId));
      } else {
        ({ error } = await db.from("products").insert({
          ...payload,
          product_code: createProductCode(),
        }));
      }

      if (error && /cover_url|PGRST204|42703/.test(`${error.code || ""} ${error.message || ""}`)) {
        const { cover_url, ...rest } = payload;
        if (editId) {
          ({ error } = await db.from("products").update(rest).eq("id", editId));
        } else {
          ({ error } = await db.from("products").insert({
            ...rest,
            product_code: createProductCode(),
          }));
        }
        if (!error) {
          showToast(editId ? "تغییرات محصول ذخیره شد." : "محصول با کد ۱۰ رقمی ثبت شد.", "success");
        }
      }

      if (error) {
        console.error(error);
        if (error.code === "23505") {
          showToast("کد محصول تکراری است. دوباره تلاش کنید.", "error");
          return;
        }
        throw new Error("ذخیره محصول انجام نشد.");
      }

      showToast(
        editId ? "تغییرات محصول ذخیره شد." : "محصول با کد ۱۰ رقمی ثبت شد.",
        "success"
      );
      resetProductForm();
      await loadProducts();
    } catch (error) {
      console.error(error);
      showToast(error.message || "عملیات ذخیره‌سازی انجام نشد.", "error");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = editId ? "ذخیره تغییرات" : "ثبت محصول";
    }
  }

  async function loginAdmin(event) {
    event.preventDefault();
    const email = $("#adminEmail").value.trim();
    const password = $("#adminPass").value;
    const errorBox = $("#loginError");
    errorBox.classList.add("hidden");

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || data.user.email !== ADMIN_EMAIL) {
      if (data?.session) await db.auth.signOut();
      errorBox.classList.remove("hidden");
      return;
    }

    state.session = data.session;
    closeOverlay("loginOverlay");
    showAdmin(true);
    showToast("ورود موفق به پنل مدیریت", "success");
  }

  async function logoutAdmin() {
    await db.auth.signOut();
    state.session = null;
    showAdmin(false);
    resetProductForm();
    showToast("از پنل مدیریت خارج شدید.", "success");
  }

  async function deleteProduct() {
    const productId = state.pendingDeleteId;
    if (!productId) return;

    const { error } = await db.from("products").delete().eq("id", productId);

    if (error) {
      console.error(error);
      showToast("حذف محصول انجام نشد.", "error");
      return;
    }

    if ($("#editId").value === productId) resetProductForm();

    state.pendingDeleteId = null;
    closeOverlay("confirmOverlay");
    showToast("محصول حذف شد.", "success");
    await loadProducts();
  }

  function searchByCode() {
    const productCode = $("#codeSearch").value.trim();
    const result = $("#codeResult");

    if (!productCode) {
      result.innerHTML = "";
      return;
    }

    const product = state.products.find((item) => {
      return item.code === productCode || formatCode(item.code) === formatCode(productCode);
    });

    if (!product) {
      result.innerHTML = `
        <div class="empty" style="margin-bottom:12px">
          محصولی با این کد ۱۰ رقمی پیدا نشد.
        </div>
      `;
      return;
    }

    result.innerHTML = `
      <div class="item" style="margin-bottom:12px">
        <img src="${escapeHtml(product.image || fallbackImage(product.name))}" alt="">
        <div>
          <h4>${escapeHtml(product.name)}</h4>
          <small>
            کد ${formatCode(product.code)}
            · ${formatPrice(product.price)} تومان
            · ${product.stock === "in" ? "موجود" : "ناموجود"}
          </small>
        </div>
        <button class="btn ghost tiny" type="button" data-edit="${product.id}">ویرایش</button>
      </div>
    `;
  }

  function bindEvents() {
    $("#year").textContent = new Date().getFullYear();
    if (localStorage.getItem("drup-shop-hide-signup-float") === "1") {
      $("#signupFloat")?.classList.add("hidden");
    }
    const openSignup = () => {
      $("#signupPhoneError")?.classList.add("hidden");
      openOverlay("signupOverlay");
    };
    $("#signupOpen")?.addEventListener("click", openSignup);
    $("#signupFloatOpen")?.addEventListener("click", openSignup);
    $("#signupFloatClose")?.addEventListener("click", (event) => {
      event.stopPropagation();
      $("#signupFloat")?.classList.add("hidden");
      localStorage.setItem("drup-shop-hide-signup-float", "1");
    });
    $("#signupForm")?.addEventListener("submit", saveCustomer);
    $("#signupPhone")?.addEventListener("input", () => {
      const phone = normalizePhone($("#signupPhone").value);
      $("#signupPhone").value = phone.slice(0, 11);
      $("#signupPhoneError")?.classList.toggle("hidden", !phone || isValidPhone(phone));
    });
    $("#customersOpen")?.addEventListener("click", () => {
      history.replaceState({}, "", "?view=customers");
      showCustomersPage();
    });
    $("#customersBack")?.addEventListener("click", (event) => {
      event.preventDefault();
      history.replaceState({}, "", "./");
      $("#customersPage")?.classList.add("hidden");
      showAdmin(true);
    });

    $("#adminTrigger").addEventListener("click", () => {
      if (state.session) {
        showAdmin(true);
        return;
      }
      $("#loginError").classList.add("hidden");
      $("#adminPass").value = "";
      openOverlay("loginOverlay");
      setTimeout(() => {
        $("#adminEmail").focus();
      }, 50);
    });

    $("#loginForm").addEventListener("submit", loginAdmin);
    $("#logoutBtn").addEventListener("click", logoutAdmin);
    $("#productForm").addEventListener("submit", saveProduct);
    $("#cardForm")?.addEventListener("submit", savePaySettings);
    $("#viewAllProducts")?.addEventListener("click", (event) => {
      event.preventDefault();
      state.cardFilter = null;
      state.page = 1;
      renderStore($("#publicSearch")?.value || "");
      $("#products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#homeCardForm")?.addEventListener("submit", saveHomeCard);
    $("#storyForm")?.addEventListener("submit", saveStory);
    $("#storyClose")?.addEventListener("click", () => $("#storyView")?.classList.add("hidden"));
    document.addEventListener("click", async (event) => {
      const cardBtn = event.target.closest("[data-home-card]");
      if (cardBtn) {
        const item = state.homeCards.find((card) => String(card.id) === String(cardBtn.dataset.homeCard));
        if (item) {
          state.cardFilter = { ids: item.ids || [], category: item.category || "" };
          state.page = 1;
          renderStore();
          $("#products")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
      const storyBtn = event.target.closest("[data-story]");
      if (storyBtn) openStory(Number(storyBtn.dataset.story));
      const delCard = event.target.closest("[data-del-card]");
      if (delCard && state.session) {
        await db.from("shop_cards").delete().eq("id", delCard.dataset.delCard);
        state.homeCards = state.homeCards.filter((item) => item.id !== delCard.dataset.delCard);
        localStorage.setItem("drup-shop-cards", JSON.stringify(state.homeCards));
        renderHomeCards();
        renderHomeAdmin();
      }
      const delStory = event.target.closest("[data-del-story]");
      if (delStory && state.session) {
        await db.from("shop_stories").delete().eq("id", delStory.dataset.delStory);
        state.stories = state.stories.filter((item) => item.id !== delStory.dataset.delStory);
        localStorage.setItem("drup-shop-stories", JSON.stringify(state.stories));
        renderStories();
        renderHomeAdmin();
      }
    });
    let startX = 0;
    $("#catWrap")?.addEventListener("touchstart", (event) => {
      startX = event.changedTouches[0].clientX;
    }, { passive: true });
    $("#catWrap")?.addEventListener("touchend", (event) => {
      const dx = event.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) moveHomeCard(dx > 0 ? -1 : 1);
    });
    setInterval(() => moveHomeCard(1), 4000);
    $("#reviewForm")?.addEventListener("submit", saveReview);
    $("#publicStars")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-star]");
      if (!button) return;
      const rate = Number(button.dataset.star);
      $("#publicReviewRate").value = String(rate);
      $$("#publicStars [data-star]").forEach((star) => {
        const value = Number(star.dataset.star);
        star.textContent = value <= rate ? "★" : "☆";
        star.classList.toggle("on", value <= rate);
      });
    });
    $("#publicReviewForm")?.addEventListener("submit", savePublicReview);
    $("#reviewReset")?.addEventListener("click", resetReviewForm);
    $("#pageContact")?.addEventListener("click", (event) => {
      event.preventDefault();
      history.replaceState({}, "", `${window.location.pathname}#contact`);
      closeProductPage();
      setTimeout(() => {
        $("#contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    });
    const openReviews = (event) => {
      event.preventDefault();
      const url = new URL(window.location.href);
      url.searchParams.delete("product");
      url.searchParams.set("view", "reviews");
      url.hash = "";
      window.location.href = url.toString();
    };
    $("#reviewsJump")?.addEventListener("click", openReviews);
    $("#reviewsNav")?.addEventListener("click", openReviews);
    $("#reviewsBack")?.addEventListener("click", (event) => {
      event.preventDefault();
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.hash = "contact";
      window.location.href = url.toString();
    });
    document.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-media]");
      if (!remove) return;
      event.preventDefault();
      event.stopPropagation();
      const key = remove.dataset.removeMedia;
      const url = decodeURIComponent(remove.dataset.url || "");
      if (!key || !state[key]) return;
      state[key] = state[key].filter((item) => item !== url);
      delete state.pendingMedia[url];
      if (key === "formCovers") {
        if ($("#pCover") && $("#pCover").value.trim() === url) $("#pCover").value = state.formCovers[0] || "";
        renderCoverPreview();
      }
      if (key === "formImages") {
        if ($("#pImage") && $("#pImage").value.trim() === url) $("#pImage").value = state.formImages[0] || "";
        renderMediaPreview("#pImagePreview", state.formImages, false, "formImages");
      }
      if (key === "formVideos") {
        if ($("#pVideo")) $("#pVideo").value = "";
        renderMediaPreview("#pVideoPreview", state.formVideos, true, "formVideos");
      }
    });
    const gallery = $("#productGallery");
    let swipeX = 0;
    gallery?.addEventListener("touchstart", (event) => {
      swipeX = event.changedTouches[0].screenX;
    }, { passive: true });
    gallery?.addEventListener("touchend", (event) => {
      const diff = event.changedTouches[0].screenX - swipeX;
      if (Math.abs(diff) < 40 || !state.gallery.length) return;
      if (diff < 0) state.galleryIndex = (state.galleryIndex + 1) % state.gallery.length;
      else state.galleryIndex = (state.galleryIndex - 1 + state.gallery.length) % state.gallery.length;
      renderGallery();
    }, { passive: true });
    $("#resetForm").addEventListener("click", resetProductForm);
    $("#galleryPrev")?.addEventListener("click", () => {
      if (!state.gallery.length) return;
      state.galleryIndex = (state.galleryIndex - 1 + state.gallery.length) % state.gallery.length;
      renderGallery();
    });
    $("#galleryNext")?.addEventListener("click", () => {
      if (!state.gallery.length) return;
      state.galleryIndex = (state.galleryIndex + 1) % state.gallery.length;
      renderGallery();
    });
    $("#galleryDots")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-gallery]");
      if (!button) return;
      state.galleryIndex = Number(button.dataset.gallery);
      renderGallery();
    });
    $("#productBack")?.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "/#products";
    });
    $("#confirmDelete").addEventListener("click", deleteProduct);

    $("#publicSearch").addEventListener("input", (event) => {
      state.page = 1;
      renderStore(event.target.value);
    });

    $$("[data-sort]").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.sort = chip.dataset.sort;
        state.page = 1;
        $$("[data-sort]").forEach((item) => item.classList.toggle("active", item === chip));
        renderStore();
      });
    });

    ["priceMin", "priceMax"].forEach((id) => {
      $(`#${id}`).addEventListener("input", () => {
        syncPriceAxis();
        clearTimeout(syncPriceAxis.timer);
        syncPriceAxis.timer = setTimeout(() => {
          state.page = 1;
          renderStore();
        }, 80);
      });
    });

    $("#productPager")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;
      goToStorePage(button.dataset.page);
    });

    $("#priceMinBox")?.addEventListener("change", () => applyPriceBox("min"));
    $("#priceMaxBox")?.addEventListener("change", () => applyPriceBox("max"));
    $("#priceMinBox")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyPriceBox("min");
      }
    });
    $("#priceMaxBox")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyPriceBox("max");
      }
    });

    $("#pImage").addEventListener("input", (event) => {
      const imageUrl = event.target.value.trim();
      if (imageUrl) setPreview(imageUrl);
    });

    $("#pFile").addEventListener("change", (event) => {
      const files = [...(event.target.files || [])];
      const local = files
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => URL.createObjectURL(file));
      if (!local.length) {
        showToast("لطفاً فقط فایل تصویر انتخاب کنید.", "error");
        event.target.value = "";
        return;
      }
      files.filter((file) => file.type.startsWith("image/")).forEach((file, index) => {
        state.pendingMedia[local[index]] = file;
      });
      state.formImages = [...state.formImages, ...local];
      event.target.value = "";
      renderMediaPreview("#pImagePreview", state.formImages, false, "formImages");
      setPreview(local[0]);
    });

    $("#pVideo")?.addEventListener("input", (event) => {
      const url = event.target.value.trim();
      if (url) {
        state.formVideos = [url, ...state.formVideos.filter((item) => item !== url)].slice(0, 3);
        renderMediaPreview("#pVideoPreview", state.formVideos, true, "formVideos");
      }
    });

    $("#pVideoFile")?.addEventListener("change", async (event) => {
      const input = event.target;
      const files = [...(input.files || [])].filter(isVideoFile);
      if (!files.length) {
        showToast("لطفاً فقط فایل ویدیو انتخاب کنید.", "error");
        input.value = "";
        return;
      }

      for (const file of files) {
        if (state.formVideos.length >= 3) {
          showToast("حداکثر ۳ ویدیو می‌توانید آپلود کنید.", "error");
          break;
        }
        try {
          showToast("در حال آپلود ویدیو...", "success", 0);
          const uploaded = await uploadProductImage(file);
          if (uploaded) {
            state.formVideos = [...state.formVideos, uploaded].slice(0, 3);
            renderMediaPreview("#pVideoPreview", state.formVideos, true, "formVideos");
            showToast("ویدیو با موفقیت آپلود شد ✓", "success");
          }
        } catch (error) {
          showToast(error.message || "آپلود ویدیو انجام نشد.", "error");
        }
      }
      input.value = "";
    });

    $("#pCover")?.addEventListener("input", (event) => {
      const url = event.target.value.trim();
      if (url) {
        state.formCovers = [url, ...state.formCovers.filter((item) => item !== url)];
        renderCoverPreview();
      }
    });

    $("#pCoverFile")?.addEventListener("change", (event) => {
      const files = [...(event.target.files || [])];
      const local = files
        .filter((file) => file.type.startsWith("image/"))
        .map((file) => URL.createObjectURL(file));
      if (!local.length) {
        showToast("لطفاً فقط فایل تصویر انتخاب کنید.", "error");
        event.target.value = "";
        return;
      }
      files.filter((file) => file.type.startsWith("image/")).forEach((file, index) => {
        state.pendingMedia[local[index]] = file;
      });
      state.formCovers = [...state.formCovers, ...local];
      event.target.value = "";
      renderCoverPreview();
    });

    $("#codeSearchBtn").addEventListener("click", searchByCode);
    $("#codeSearch").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchByCode();
      }
    });

    $$("[data-close]").forEach((button) => {
      button.addEventListener("click", () => {
        closeOverlay(button.dataset.close);
      });
    });

    $$(".overlay").forEach((overlay) => {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) overlay.classList.remove("open");
      });
    });

    document.addEventListener("click", async (event) => {
      const copyButton = event.target.closest("[data-copy]");
      if (copyButton) {
        try {
          await navigator.clipboard.writeText(copyButton.dataset.copy);
          showToast("کد محصول با موفقیت کپی شد ✓", "success");
        } catch {
          showToast("کپی انجام نشد. کد را دستی بردارید.", "error");
        }
      }

      const detailButton = event.target.closest("[data-detail]");
      if (
        detailButton &&
        !event.target.closest("[data-order], [data-copy], [data-edit], [data-delete]")
      ) {
        const product = state.products.find((item) => item.id === detailButton.dataset.detail);
        if (product) openProductDetail(product);
      }

      const orderButton = event.target.closest("[data-order]");
      if (orderButton && !orderButton.disabled) {
        const product = state.products.find((item) => item.id === orderButton.dataset.order);
        if (!product) return;
        $("#orderName").textContent = product.name;
        $("#orderPrice").textContent = `${formatPrice(product.price)} تومان`;
        $("#orderCode").textContent = formatCode(product.code);
        applyPayInfo();
        openOverlay("orderOverlay");
      }

      const editButton = event.target.closest("[data-edit]");
      if (editButton) {
        const product = state.products.find((item) => item.id === editButton.dataset.edit);
        if (product) fillProductForm(product);
      }

      const deleteButton = event.target.closest("[data-delete]");
      if (deleteButton) {
        state.pendingDeleteId = deleteButton.dataset.delete;
        openOverlay("confirmOverlay");
      }

      const reviewEdit = event.target.closest("[data-review-edit]");
      if (reviewEdit) {
        const item = state.reviews.find((row) => row.id === reviewEdit.dataset.reviewEdit);
        if (item) {
          $("#reviewId").value = item.id;
          $("#reviewName").value = item.name;
          $("#reviewText").value = item.text;
          $("#reviewRate").value = String(item.rate);
        }
      }

      const reviewDelete = event.target.closest("[data-review-delete]");
      if (reviewDelete) {
        state.reviews = state.reviews.filter((row) => row.id !== reviewDelete.dataset.reviewDelete);
        localStorage.setItem("drup-shop-reviews", JSON.stringify(state.reviews));
        db.from("shop_reviews").delete().eq("id", reviewDelete.dataset.reviewDelete);
        renderReviews();
        showToast("نظر حذف شد.", "success");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        $$(".overlay.open").forEach((overlay) => overlay.classList.remove("open"));
      }
    });

    db.auth.onAuthStateChange((_event, session) => {
      state.session = session;
      if (!session) showAdmin(false);
    });
  }

  async function init() {
    bindEvents();
    const {
      data: { session },
    } = await db.auth.getSession();
    state.session = session;
    await loadPaySettings();
    await loadHomeExtras();
    await loadReviews();
    await loadCustomers();
    await loadProducts();
    $("#bootLoad")?.classList.add("hidden");
    const params = new URLSearchParams(window.location.search);
    const routedProduct = findProductFromLocation();
    if (routedProduct) {
      if (params.get("product")) {
        history.replaceState({}, "", productPath(routedProduct));
      }
      showProductPage(routedProduct);
    } else if (params.get("view") === "reviews") {
      showReviewsPage();
    } else if (params.get("view") === "customers" && session && session.user.email === ADMIN_EMAIL) {
      showCustomersPage();
    } else if (session && session.user.email === ADMIN_EMAIL) {
      showAdmin(true);
    }
  }

  init();
})();
