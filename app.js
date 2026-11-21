const {
  Client,
  Account,
  TablesDB,
  ID,
  Query,
  Permission,
  Role
} = Appwrite;


/* =========================================================
   CONFIGURAÇÃO MAKARIA
========================================================= */

const CONFIG = {
  endpoint: "https://nyc.cloud.appwrite.io/v1",

  projectId: "6b01e299000b19ac36ce",

  databaseId: "6b01e350001ca47807e5",

  tables: {

    profiles: "COLE_ID_PROFILES",
    settings: "COLE_ID_SETTINGS",
    transactions: "COLE_ID_TRANSACTIONS",
    goals: "COLE_ID_GOALS",
    accounts: "COLE_ID_ACCOUNTS",
    categories: "COLE_ID_CATEGORIES",
    bills: "COLE_ID_BILLS",
    cards: "COLE_ID_CARDS"

  }
};


/* =========================================================
   APPWRITE
========================================================= */

const client = new Client();

client
  .setEndpoint(CONFIG.endpoint)
  .setProject(CONFIG.projectId);

const account = new Account(client);
const tablesDB = new TablesDB(client);


/* =========================================================
   ESTADO
========================================================= */

let currentUser = null;
let currentPage = "home";


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (id) => document.getElementById(id);


/* =========================================================
   TOAST
========================================================= */

function toast(message, type = "normal") {

  const el = $("toast");

  if (!el) return;

  el.textContent = message;
  el.className = `toast ${type}`;

  setTimeout(() => {

    el.textContent = "";
    el.className = "";

  }, 3500);
}


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

async function getUser() {

  try {

    return await account.get();

  } catch {

    return null;

  }

}


async function signup(name, email, password) {

  try {

    const user = await account.create(
      ID.unique(),
      email,
      password,
      name
    );

    await account.createEmailPasswordSession(
      email,
      password
    );

    currentUser = user;

    await ensureProfile();

    await ensureSettings();

    showApp();

    toast("conta criada com sucesso");

  } catch (error) {

    console.error(error);

    toast(
      error.message || "não foi possível criar a conta",
      "error"
    );

  }

}


async function login(email, password) {

  try {

    await account.createEmailPasswordSession(
      email,
      password
    );

    currentUser = await account.get();

    await ensureProfile();

    await ensureSettings();

    showApp();

    toast("login realizado");

  } catch (error) {

    console.error(error);

    toast(
      error.message || "e-mail ou senha inválidos",
      "error"
    );

  }

}


async function logout() {

  try {

    await account.deleteSession("current");

  } catch (error) {

    console.error(error);

  }

  currentUser = null;

  $("app").classList.add("hide");
  $("auth").classList.remove("hide");

}


/* =========================================================
   PERFIL
========================================================= */

async function ensureProfile() {

  try {

    await tablesDB.getRow({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tables.profiles,
      rowId: currentUser.$id
    });

  } catch {

    await tablesDB.createRow({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tables.profiles,
      rowId: currentUser.$id,

      data: {
        full_name: currentUser.name || "",
        email: currentUser.email || "",
        avatar_url: ""
      },

      permissions: [
        Permission.read(
          Role.user(currentUser.$id)
        ),

        Permission.update(
          Role.user(currentUser.$id)
        ),

        Permission.delete(
          Role.user(currentUser.$id)
        )
      ]
    });

  }

}


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

async function ensureSettings() {

  try {

    const result = await tablesDB.listRows({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tables.settings,
      queries: [
        Query.equal("user_id", currentUser.$id),
        Query.limit(1)
      ]
    });

    if (result.total > 0) return;

    await tablesDB.createRow({

      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tables.settings,
      rowId: ID.unique(),

      data: {
        user_id: currentUser.$id,
        gross_salary: 2759.74,
        advance_pct: 40,
        inss_pct: 9,
        assist_pct: 2,
        life_insurance: 3.82,
        negocial: 21
      },

      permissions: [
        Permission.read(
          Role.user(currentUser.$id)
        ),

        Permission.update(
          Role.user(currentUser.$id)
        ),

        Permission.delete(
          Role.user(currentUser.$id)
        )
      ]

    });

  } catch (error) {

    console.error("Erro ao criar configurações:", error);

  }

}


/* =========================================================
   TABELAS
========================================================= */

async function listRows(table) {

  const result = await tablesDB.listRows({

    databaseId: CONFIG.databaseId,

    tableId: CONFIG.tables[table],

    queries: [
      Query.equal("user_id", currentUser.$id),
      Query.limit(100)
    ]

  });

  return result.rows || [];

}


async function createRow(table, data) {

  return await tablesDB.createRow({

    databaseId: CONFIG.databaseId,

    tableId: CONFIG.tables[table],

    rowId: ID.unique(),

    data: {
      user_id: currentUser.$id,
      ...data
    },

    permissions: [

      Permission.read(
        Role.user(currentUser.$id)
      ),

      Permission.update(
        Role.user(currentUser.$id)
      ),

      Permission.delete(
        Role.user(currentUser.$id)
      )

    ]

  });

}


/* =========================================================
   MOSTRAR APP
========================================================= */

function showApp() {

  $("auth").classList.add("hide");
  $("app").classList.remove("hide");

  $("hello").textContent =
    `olá, ${currentUser.name || "Mirela"}`;

  loadPage(currentPage);

}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function setupNavigation() {

  document
    .querySelectorAll("[data-page]")
    .forEach(button => {

      button.addEventListener("click", () => {

        currentPage = button.dataset.page;

        document
          .querySelectorAll("[data-page]")
          .forEach(btn =>
            btn.classList.remove("active")
          );

        button.classList.add("active");

        loadPage(currentPage);

      });

    });

}


/* =========================================================
   PÁGINAS
========================================================= */

async function loadPage(page) {

  const main = $("main");

  if (!main) return;

  if (page === "home") {

    renderHome();

    return;

  }


  if (page === "transactions") {

    await renderTransactions();

    return;

  }


  if (page === "goals") {

    await renderGoals();

    return;

  }


  if (page === "accounts") {

    await renderAccounts();

    return;

  }


  if (page === "cards") {

    await renderCards();

    return;

  }


  if (page === "salary") {

    renderSalary();

    return;

  }


  if (page === "categories") {

    await renderCategories();

    return;

  }

}


/* =========================================================
   HOME
========================================================= */

function renderHome() {

  $("main").innerHTML = `

    <section class="page">

      <h1>visão geral</h1>

      <p>
        acompanhe sua vida financeira com clareza.
      </p>

      <div class="cards">

        <div class="card">
          <small>saldo disponível</small>
          <strong id="homeBalance">
            R$ 0,00
          </strong>
        </div>

        <div class="card">
          <small>entradas</small>
          <strong id="homeIncome">
            R$ 0,00
          </strong>
        </div>

        <div class="card">
          <small>gastos</small>
          <strong id="homeExpenses">
            R$ 0,00
          </strong>
        </div>

        <div class="card">
          <small>investimentos</small>
          <strong id="homeInvestments">
            R$ 0,00
          </strong>
        </div>

      </div>

    </section>

  `;

  calculateHome();

}


async function calculateHome() {

  try {

    const rows = await listRows("transactions");

    let income = 0;
    let expenses = 0;
    let investments = 0;

    rows.forEach(row => {

      const amount = Number(row.amount) || 0;

      if (row.type === "entrada") {
        income += amount;
      }

      if (row.type === "saida") {
        expenses += amount;
      }

      if (row.type === "investimento") {
        investments += amount;
      }

    });

    const balance =
      income - expenses - investments;

    $("homeBalance").textContent =
      money(balance);

    $("homeIncome").textContent =
      money(income);

    $("homeExpenses").textContent =
      money(expenses);

    $("homeInvestments").textContent =
      money(investments);

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   TRANSAÇÕES
========================================================= */

async function renderTransactions() {

  $("main").innerHTML = `

    <section class="page">

      <h1>transações</h1>

      <p>
        registre suas entradas, gastos e investimentos.
      </p>

      <form id="transactionForm">

        <label>
          tipo

          <select id="tType">

            <option value="entrada">
              entrada
            </option>

            <option value="saida">
              gasto
            </option>

            <option value="investimento">
              investimento
            </option>

            <option value="transferencia">
              transferência
            </option>

          </select>

        </label>


        <label>
          valor

          <input
            id="tAmount"
            type="number"
            min="0"
            step="0.01"
            required
          >

        </label>


        <label>
          categoria

          <input
            id="tCategory"
            placeholder="ex.: alimentação"
            required
          >

        </label>


        <label>
          descrição

          <input
            id="tDescription"
            placeholder="opcional"
          >

        </label>


        <label>
          data

          <input
            id="tDate"
            type="date"
            required
          >

        </label>


        <label>
          forma de pagamento

          <input
            id="tPayment"
            placeholder="pix, cartão, dinheiro..."
          >

        </label>


        <button class="primary">
          salvar transação
        </button>

      </form>


      <div id="transactionList">
        carregando...
      </div>

    </section>

  `;


  $("tDate").value =
    new Date().toISOString().slice(0, 10);


  $("transactionForm")
    .addEventListener("submit", saveTransaction);


  await loadTransactions();

}


async function saveTransaction(event) {

  event.preventDefault();

  try {

    await createRow("transactions", {

      type: $("tType").value,

      amount: Number(
        $("tAmount").value
      ),

      category:
        $("tCategory").value.trim(),

      description:
        $("tDescription").value.trim(),

      transaction_date:
        $("tDate").value,

      payment_method:
        $("tPayment").value.trim(),

      installments: 1,

      installment_number: 1

    });


    toast("transação salva");

    event.target.reset();

    $("tDate").value =
      new Date().toISOString().slice(0, 10);

    await loadTransactions();

  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      "não foi possível salvar a transação",
      "error"
    );

  }

}


async function loadTransactions() {

  const list = $("transactionList");

  if (!list) return;

  try {

    const rows =
      await listRows("transactions");

    if (!rows.length) {

      list.innerHTML = `
        <div class="empty">
          nenhuma transação cadastrada.
        </div>
      `;

      return;

    }


    rows.sort((a, b) =>
      String(b.transaction_date)
        .localeCompare(
          String(a.transaction_date)
        )
    );


    list.innerHTML = rows.map(row => `

      <div class="transaction">

        <div>

          <strong>
            ${escapeHTML(row.category)}
          </strong>

          <small>
            ${escapeHTML(
              row.description || ""
            )}
          </small>

          <small>
            ${formatDate(
              row.transaction_date
            )}
          </small>

        </div>

        <strong>
          ${money(row.amount)}
        </strong>

      </div>

    `).join("");

  } catch (error) {

    console.error(error);

    list.innerHTML = `
      <div class="empty">
        não foi possível carregar as transações.
      </div>
    `;

  }

}


/* =========================================================
   METAS
========================================================= */

async function renderGoals() {

  $("main").innerHTML = `

    <section class="page">

      <h1>metas</h1>

      <p>
        transforme seus planos em objetivos financeiros.
      </p>

      <form id="goalForm">

        <label>
          nome da meta

          <input
            id="goalName"
            required
          >

        </label>

        <label>
          valor desejado

          <input
            id="goalTarget"
            type="number"
            min="0"
            step="0.01"
            required
          >

        </label>

        <label>
          quanto já possui

          <input
            id="goalSaved"
            type="number"
            min="0"
            step="0.01"
            value="0"
          >

        </label>

        <label>
          prazo

          <input
            id="goalDate"
            type="date"
          >

        </label>

        <button class="primary">
          criar meta
        </button>

      </form>

      <div id="goalList">
        carregando...
      </div>

    </section>

  `;


  $("goalForm")
    .addEventListener("submit", saveGoal);

  await loadGoals();

}


async function saveGoal(event) {

  event.preventDefault();

  try {

    await createRow("goals", {

      name:
        $("goalName").value.trim(),

      target_amount:
        Number($("goalTarget").value),

      saved_amount:
        Number($("goalSaved").value || 0),

      target_date:
        $("goalDate").value || "",

      description: ""

    });

    toast("meta criada");

    event.target.reset();

    await loadGoals();

  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      "não foi possível criar a meta",
      "error"
    );

  }

}


async function loadGoals() {

  const list = $("goalList");

  if (!list) return;

  try {

    const rows =
      await listRows("goals");

    if (!rows.length) {

      list.innerHTML = `
        <div class="empty">
          nenhuma meta cadastrada.
        </div>
      `;

      return;

    }


    list.innerHTML = rows.map(row => {

      const target =
        Number(row.target_amount) || 0;

      const saved =
        Number(row.saved_amount) || 0;

      const percent =
        target > 0
          ? Math.min(
              100,
              (saved / target) * 100
            )
          : 0;

      return `

        <div class="goal">

          <div>

            <strong>
              ${escapeHTML(row.name)}
            </strong>

            <small>
              ${money(saved)}
              de
              ${money(target)}
            </small>

          </div>

          <div class="progress">

            <span
              style="width:${percent}%"
            ></span>

          </div>

          <small>
            ${percent.toFixed(0)}%
          </small>

        </div>

      `;

    }).join("");

  } catch (error) {

    console.error(error);

    list.innerHTML = `
      <div class="empty">
        não foi possível carregar as metas.
      </div>
    `;

  }

}


/* =========================================================
   CONTAS
========================================================= */

async function renderAccounts() {

  $("main").innerHTML = `

    <section class="page">

      <h1>contas</h1>

      <p>
        organize suas contas e saldos.
      </p>

      <form id="accountForm">

        <label>
          nome

          <input
            id="accountName"
            required
          >

        </label>

        <label>
          saldo

          <input
            id="accountBalance"
            type="number"
            step="0.01"
            value="0"
          >

        </label>

        <label>
          dia de vencimento

          <input
            id="accountDue"
            type="number"
            min="1"
            max="31"
          >

        </label>

        <button class="primary">
          adicionar conta
        </button>

      </form>

      <div id="accountList">
        carregando...
      </div>

    </section>

  `;


  $("accountForm")
    .addEventListener("submit", saveAccount);

  await loadAccounts();

}


async function saveAccount(event) {

  event.preventDefault();

  try {

    await createRow("accounts", {

      name:
        $("accountName").value.trim(),

      balance:
        Number(
          $("accountBalance").value || 0
        ),

      due_day:
        Number(
          $("accountDue").value || 0
        ),

      recurring: false

    });

    toast("conta adicionada");

    event.target.reset();

    await loadAccounts();

  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      "não foi possível adicionar a conta",
      "error"
    );

  }

}


async function loadAccounts() {

  const list = $("accountList");

  if (!list) return;

  try {

    const rows =
      await listRows("accounts");

    if (!rows.length) {

      list.innerHTML = `
        <div class="empty">
          nenhuma conta cadastrada.
        </div>
      `;

      return;

    }


    list.innerHTML = rows.map(row => `

      <div class="item">

        <strong>
          ${escapeHTML(row.name)}
        </strong>

        <span>
          ${money(row.balance)}
        </span>

      </div>

    `).join("");

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   CARTÕES
========================================================= */

async function renderCards() {

  $("main").innerHTML = `

    <section class="page">

      <h1>cartões</h1>

      <p>
        acompanhe seus cartões e faturas.
      </p>

      <form id="cardForm">

        <label>
          nome do cartão

          <input
            id="cardName"
            required
          >

        </label>

        <label>
          limite

          <input
            id="cardLimit"
            type="number"
            step="0.01"
            required
          >

        </label>

        <label>
          fatura atual

          <input
            id="cardBill"
            type="number"
            step="0.01"
            value="0"
          >

        </label>

        <label>
          fechamento

          <input
            id="cardClosing"
            type="number"
            min="1"
            max="31"
          >

        </label>

        <label>
          vencimento

          <input
            id="cardDue"
            type="number"
            min="1"
            max="31"
          >

        </label>

        <button class="primary">
          adicionar cartão
        </button>

      </form>

      <div id="cardList">
        carregando...
      </div>

    </section>

  `;


  $("cardForm")
    .addEventListener("submit", saveCard);

  await loadCards();

}


async function saveCard(event) {

  event.preventDefault();

  try {

    await createRow("cards", {

      name:
        $("cardName").value.trim(),

      credit_limit:
        Number($("cardLimit").value),

      current_bill:
        Number(
          $("cardBill").value || 0
        ),

      closing_day:
        Number(
          $("cardClosing").value || 0
        ),

      due_day:
        Number(
          $("cardDue").value || 0
        )

    });

    toast("cartão adicionado");

    event.target.reset();

    await loadCards();

  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      "não foi possível adicionar o cartão",
      "error"
    );

  }

}


async function loadCards() {

  const list = $("cardList");

  if (!list) return;

  try {

    const rows =
      await listRows("cards");

    if (!rows.length) {

      list.innerHTML = `
        <div class="empty">
          nenhum cartão cadastrado.
        </div>
      `;

      return;

    }


    list.innerHTML = rows.map(row => `

      <div class="item">

        <div>

          <strong>
            ${escapeHTML(row.name)}
          </strong>

          <small>
            fatura atual:
            ${money(row.current_bill)}
          </small>

        </div>

        <span>
          limite:
          ${money(row.credit_limit)}
        </span>

      </div>

    `).join("");

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   SALÁRIO
========================================================= */

function renderSalary() {

  $("main").innerHTML = `

    <section class="page">

      <h1>salário</h1>

      <p>
        configure sua remuneração e veja uma estimativa do líquido.
      </p>

      <div class="salary-card">

        <label>
          salário bruto

          <input
            id="salaryGross"
            type="number"
            step="0.01"
            value="2759.74"
          >

        </label>

        <label>
          adiantamento %

          <input
            id="salaryAdvance"
            type="number"
            step="0.01"
            value="40"
          >

        </label>

        <label>
          INSS %

          <input
            id="salaryInss"
            type="number"
            step="0.01"
            value="9"
          >

        </label>

        <label>
          assistencial

          <input
            id="salaryAssist"
            type="number"
            step="0.01"
            value="2"
          >

        </label>

        <label>
          seguro de vida

          <input
            id="salaryLife"
            type="number"
            step="0.01"
            value="3.82"
          >

        </label>

        <label>
          negocial

          <input
            id="salaryNegocial"
            type="number"
            step="0.01"
            value="21"
          >

        </label>

        <button
          class="primary"
          id="calculateSalary"
        >
          calcular
        </button>

      </div>

      <div id="salaryResult"></div>

    </section>

  `;


  $("calculateSalary")
    .addEventListener(
      "click",
      calculateSalary
    );

}


function calculateSalary() {

  const gross =
    Number($("salaryGross").value || 0);

  const advancePct =
    Number($("salaryAdvance").value || 0);

  const inssPct =
    Number($("salaryInss").value || 0);

  const assistPct =
    Number($("salaryAssist").value || 0);

  const life =
    Number($("salaryLife").value || 0);

  const negocial =
    Number($("salaryNegocial").value || 0);


  const inss =
    gross * (inssPct / 100);

  const assist =
    gross * (assistPct / 100);

  const liquid =
    gross -
    inss -
    assist -
    life -
    negocial;


  const advance =
    gross * (advancePct / 100);

  const remaining =
    liquid - advance;


  $("salaryResult").innerHTML = `

    <div class="cards">

      <div class="card">
        <small>bruto</small>
        <strong>
          ${money(gross)}
        </strong>
      </div>

      <div class="card">
        <small>INSS</small>
        <strong>
          ${money(inss)}
        </strong>
      </div>

      <div class="card">
        <small>adiantamento</small>
        <strong>
          ${money(advance)}
        </strong>
      </div>

      <div class="card">
        <small>líquido estimado</small>
        <strong>
          ${money(liquid)}
        </strong>
      </div>

      <div class="card">
        <small>restante</small>
        <strong>
          ${money(remaining)}
        </strong>
      </div>

    </div>

  `;

}


/* =========================================================
   CATEGORIAS
========================================================= */

async function renderCategories() {

  $("main").innerHTML = `

    <section class="page">

      <h1>categorias</h1>

      <p>
        organize seus gastos por categoria.
      </p>

      <form id="categoryForm">

        <label>
          nome

          <input
            id="categoryName"
            required
          >

        </label>

        <label>
          ícone

          <input
            id="categoryIcon"
            value="◈"
          >

        </label>

        <label>
          limite mensal

          <input
            id="categoryLimit"
            type="number"
            min="0"
            step="0.01"
            value="0"
          >

        </label>

        <button class="primary">
          adicionar categoria
        </button>

      </form>

      <div id="categoryList">
        carregando...
      </div>

    </section>

  `;


  $("categoryForm")
    .addEventListener(
      "submit",
      saveCategory
    );

  await loadCategories();

}


async function saveCategory(event) {

  event.preventDefault();

  try {

    await createRow("categories", {

      name:
        $("categoryName")
          .value
          .trim(),

      icon:
        $("categoryIcon")
          .value
          .trim(),

      monthly_limit:
        Number(
          $("categoryLimit")
            .value || 0
        )

    });

    toast("categoria criada");

    event.target.reset();

    await loadCategories();

  } catch (error) {

    console.error(error);

    toast(
      error.message ||
      "não foi possível criar a categoria",
      "error"
    );

  }

}


async function loadCategories() {

  const list =
    $("categoryList");

  if (!list) return;

  try {

    const rows =
      await listRows(
        "categories"
      );

    if (!rows.length) {

      list.innerHTML = `
        <div class="empty">
          nenhuma categoria cadastrada.
        </div>
      `;

      return;

    }


    list.innerHTML =
      rows.map(row => `

        <div class="item">

          <span>

            ${escapeHTML(
              row.icon
            )}

            ${escapeHTML(
              row.name
            )}

          </span>

          <strong>
            ${money(
              row.monthly_limit
            )}
          </strong>

        </div>

      `).join("");

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   UTILITÁRIOS
========================================================= */

function money(value) {

  return Number(value || 0)
    .toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    );

}


function formatDate(date) {

  if (!date) return "";

  const parts =
    String(date)
      .split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* =========================================================
   TEMA
========================================================= */

function setupTheme() {

  const button = $("theme");

  if (!button) return;

  const saved =
    localStorage.getItem(
      "makaria-theme"
    );

  if (saved === "dark") {

    document.body.classList.add(
      "dark"
    );

  }


  button.addEventListener(
    "click",
    () => {

      document.body.classList.toggle(
        "dark"
      );

      localStorage.setItem(
        "makaria-theme",

        document.body.classList.contains(
          "dark"
        )
          ? "dark"
          : "light"
      );

    }
  );

}


/* =========================================================
   AUTH FORM
========================================================= */

function setupAuth() {

  const tabs =
    document.querySelectorAll(
      ".tabs button"
    );

  const nameBox =
    $("nameBox");

  const button =
    $("authBtn");

  let mode = "login";


  tabs.forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        tabs.forEach(t =>
          t.classList.remove(
            "active"
          )
        );

        tab.classList.add(
          "active"
        );

        mode =
          tab.dataset.mode;

        if (mode === "signup") {

          nameBox.classList.remove(
            "hide"
          );

          button.textContent =
            "Criar conta";

        } else {

          nameBox.classList.add(
            "hide"
          );

          button.textContent =
            "Entrar";

        }

        $("authMsg").textContent =
          "";

      }
    );

  });


  $("authForm")
    .addEventListener(
      "submit",
      async event => {

        event.preventDefault();

        const email =
          $("email").value.trim();

        const password =
          $("pass").value;

        if (mode === "signup") {

          const name =
            $("name")
              .value
              .trim();

          if (!name) {

            toast(
              "informe seu nome",
              "error"
            );

            return;

          }

          await signup(
            name,
            email,
            password
          );

        } else {

          await login(
            email,
            password
          );

        }

      }
    );

}


/* =========================================================
   LOGOUT
========================================================= */

function setupLogout() {

  $("logout")
    ?.addEventListener(
      "click",
      logout
    );

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

  setupAuth();

  setupNavigation();

  setupTheme();

  setupLogout();


  currentUser =
    await getUser();


  if (currentUser) {

    showApp();

  } else {

    $("app")
      .classList
      .add("hide");

    $("auth")
      .classList
      .remove("hide");

  }

}


init();
