const C = {
  endpoint: 'https://nyc.cloud.appwrite.io/v1',
  projectId: '6b01e299000b19ac36ce',
  databaseId: '6b01e350001ca47807e5',

  tables: {
    profiles: 'profiles',
    settings: '6b01e569002a228a1c5b',
    transactions: '6b01e6aa0036b4223488',
    goals: '6b01e8700035f839daea',
    accounts: '6b01fc9a00179915f55c',
    categories: '6b01fd500025ac427542',
    bills: '6b01fdb800341288b640',
    cards: '6b020079002ad9473ae5'
  }
};


/* =========================
   APPWRITE
========================= */

async function api(path, options = {}) {
  const response = await fetch(C.endpoint + path, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      'X-Appwrite-Project': C.projectId,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body
  });

  let data = {};

  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(
      data?.message ||
      `Erro ${response.status} ao acessar o Appwrite`
    );
  }

  return data;
}


/* =========================
   APPWRITE AUTH
========================= */

const A = {

  me() {
    return api('/account');
  },

  login(email, password) {
    return api('/account/sessions/email', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password
      })
    });
  },

  signup(name, email, password) {
    return api('/account', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'unique()',
        email,
        password,
        name
      })
    });
  },

  logout() {
    return api('/account/sessions/current', {
      method: 'DELETE'
    });
  },


  /* =========================
     TABLES
  ========================= */

  async list(table) {
    const result = await api(
      `/databases/${C.databaseId}/tables/${C.tables[table]}/rows?limit=100`
    );

    return result.rows || [];
  },


  async create(table, data, userId) {

    const permissions = [
      `read("user:${userId}")`,
      `update("user:${userId}")`,
      `delete("user:${userId}")`
    ];

    return api(
      `/databases/${C.databaseId}/tables/${C.tables[table]}/rows`,
      {
        method: 'POST',
        body: JSON.stringify({
          rowId: 'unique()',
          data,
          permissions
        })
      }
    );
  },


  update(table, rowId, data) {

    return api(
      `/databases/${C.databaseId}/tables/${C.tables[table]}/rows/${rowId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          data
        })
      }
    );
  },


  delete(table, rowId) {

    return api(
      `/databases/${C.databaseId}/tables/${C.tables[table]}/rows/${rowId}`,
      {
        method: 'DELETE'
      }
    );
  }
};


/* =========================
   ELEMENTOS
========================= */

const $ = selector => document.querySelector(selector);

const auth = $('#auth');
const app = $('#app');
const authForm = $('#authForm');
const authBtn = $('#authBtn');
const authMsg = $('#authMsg');
const nameBox = $('#nameBox');
const nameInput = $('#name');
const emailInput = $('#email');
const passInput = $('#pass');


/* =========================
   ESTADO
========================= */

let user = null;
let mode = 'login';


/* =========================
   TOAST
========================= */

function toast(message) {

  const el = $('#toast');

  if (!el) return;

  el.textContent = message;
  el.classList.add('show');

  setTimeout(() => {
    el.classList.remove('show');
  }, 3000);
}


/* =========================
   AUTH VISUAL
========================= */

function showAuth() {

  auth?.classList.remove('hide');
  app?.classList.add('hide');
}


function showApp() {

  auth?.classList.add('hide');
  app?.classList.remove('hide');
}


/* =========================
   TABS LOGIN / CADASTRO
========================= */

document.querySelectorAll('[data-mode]').forEach(button => {

  button.addEventListener('click', () => {

    mode = button.dataset.mode;

    document
      .querySelectorAll('[data-mode]')
      .forEach(btn => btn.classList.remove('active'));

    button.classList.add('active');

    if (mode === 'signup') {

      nameBox?.classList.remove('hide');

      authBtn.textContent = 'Criar conta';

      nameInput.required = true;

    } else {

      nameBox?.classList.add('hide');

      authBtn.textContent = 'Entrar';

      nameInput.required = false;
    }

    if (authMsg) {
      authMsg.textContent = '';
    }
  });
});


/* =========================
   LOGIN / CADASTRO
========================= */

authForm?.addEventListener('submit', async event => {

  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passInput.value;
  const name = nameInput?.value.trim() || '';

  authBtn.disabled = true;

  authMsg.textContent = 'aguarde...';

  try {

    if (mode === 'signup') {

      if (!name) {
        throw new Error('Digite seu nome completo.');
      }

      await A.signup(name, email, password);

      /*
       * Depois de criar a conta,
       * fazemos login automaticamente.
       */

      await A.login(email, password);

      user = await A.me();

      await createInitialProfile();

      await createInitialSettings();

      toast('conta criada com sucesso');

    } else {

      await A.login(email, password);

      user = await A.me();

      await ensureProfile();

      await ensureSettings();

      toast('login realizado');

    }

    showApp();

    await startApp();

  } catch (error) {

    console.error(error);

    authMsg.textContent =
      error.message || 'não foi possível continuar.';

  } finally {

    authBtn.disabled = false;
  }
});


/* =========================
   PROFILE
========================= */

async function createInitialProfile() {

  if (!user) return;

  try {

    await A.create(
      'profiles',
      {
        full_name: user.name || nameInput.value.trim(),
        email: user.email,
        avatar_url: ''
      },
      user.$id
    );

  } catch (error) {

    console.warn('perfil não criado:', error.message);
  }
}


async function ensureProfile() {

  try {

    const rows = await A.list('profiles');

    const mine = rows.find(
      row => row.data?.email === user.email
    );

    if (!mine) {
      await createInitialProfile();
    }

  } catch (error) {

    console.warn('não foi possível verificar perfil:', error.message);
  }
}


/* =========================
   SETTINGS
========================= */

async function createInitialSettings() {

  if (!user) return;

  try {

    await A.create(
      'settings',
      {
        user_id: user.$id,
        gross_salary: 2759.74,
        advance_pct: 40,
        inss_pct: 9,
        assist_pct: 2,
        life_insurance: 3.82,
        negocial: 21
      },
      user.$id
    );

  } catch (error) {

    console.warn('configuração inicial não criada:', error.message);
  }
}


async function ensureSettings() {

  try {

    const rows = await A.list('settings');

    const mine = rows.find(
      row => row.data?.user_id === user.$id
    );

    if (!mine) {
      await createInitialSettings();
    }

  } catch (error) {

    console.warn(
      'não foi possível verificar configurações:',
      error.message
    );
  }
}


/* =========================
   LOGOUT
========================= */

$('#logout')?.addEventListener('click', async () => {

  try {

    await A.logout();

  } catch (error) {

    console.warn(error);

  } finally {

    user = null;

    showAuth();

    toast('sessão encerrada');
  }
});


/* =========================
   TEMA
========================= */

$('#theme')?.addEventListener('click', () => {

  document.body.classList.toggle('dark');

  const dark =
    document.body.classList.contains('dark');

  localStorage.setItem(
    'makaria-theme',
    dark ? 'dark' : 'light'
  );
});


function loadTheme() {

  const theme =
    localStorage.getItem('makaria-theme');

  if (theme === 'dark') {
    document.body.classList.add('dark');
  }
}


/* =========================
   NAVEGAÇÃO
========================= */

document.querySelectorAll('[data-page]').forEach(button => {

  button.addEventListener('click', () => {

    document
      .querySelectorAll('[data-page]')
      .forEach(btn => btn.classList.remove('active'));

    button.classList.add('active');

    renderPage(button.dataset.page);
  });
});


/* =========================
   PÁGINAS
========================= */

async function renderPage(page) {

  const main = $('#main');

  if (!main) return;

  if (page === 'home') {

    renderHome();
    return;
  }

  if (page === 'transactions') {

    renderTransactions();
    return;
  }

  if (page === 'goals') {

    renderGoals();
    return;
  }

  if (page === 'accounts') {

    renderAccounts();
    return;
  }

  if (page === 'cards') {

    renderCards();
    return;
  }

  if (page === 'salary') {

    renderSalary();
    return;
  }

  if (page === 'categories') {

    renderCategories();
    return;
  }
}


/* =========================
   HOME
========================= */

function renderHome() {

  const main = $('#main');

  main.innerHTML = `

    <div class="page">

      <div class="page-title">

        <div>
          <h1>visão geral</h1>

          <p>
            acompanhe sua vida financeira.
          </p>
        </div>

      </div>


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
          <strong id="homeExpense">
            R$ 0,00
          </strong>
        </div>

        <div class="card">
          <small>investimentos</small>
          <strong id="homeInvestment">
            R$ 0,00
          </strong>
        </div>

      </div>


      <div class="panel">

        <h2>bem-vinda à makaria</h2>

        <p>
          organize seu dinheiro com propósito,
          acompanhe suas metas e construa sua
          prosperidade.
        </p>

      </div>

    </div>
  `;

  loadHomeData();
}


async function loadHomeData() {

  try {

    const rows = await A.list('transactions');

    const mine = rows.filter(
      row => row.data?.user_id === user.$id
    );

    let income = 0;
    let expense = 0;
    let investment = 0;

    mine.forEach(row => {

      const amount =
        Number(row.data.amount) || 0;

      const type =
        row.data.type;

      if (type === 'income') {

        income += amount;

      } else if (type === 'expense') {

        expense += amount;

      } else if (type === 'investment') {

        investment += amount;

      }

    });

    const balance =
      income - expense - investment;

    $('#homeBalance').textContent =
      money(balance);

    $('#homeIncome').textContent =
      money(income);

    $('#homeExpense').textContent =
      money(expense);

    $('#homeInvestment').textContent =
      money(investment);

  } catch (error) {

    console.error(error);

  }
}


/* =========================
   TRANSAÇÕES
========================= */

function renderTransactions() {

  const main = $('#main');

  main.innerHTML = `

    <div class="page">

      <div class="page-title">

        <div>
          <h1>transações</h1>
          <p>
            registre suas entradas, gastos e investimentos.
          </p>
        </div>

      </div>


      <div class="panel">

        <form id="transactionForm">

          <label>
            tipo

            <select id="transactionType">

              <option value="income">
                entrada
              </option>

              <option value="expense">
                gasto
              </option>

              <option value="investment">
                investimento
              </option>

            </select>

          </label>


          <label>
            valor

            <input
              id="transactionAmount"
              type="number"
              step="0.01"
              min="0"
              required
            >

          </label>


          <label>
            categoria

            <input
              id="transactionCategory"
              required
            >

          </label>


          <label>
            descrição

            <input
              id="transactionDescription"
            >

          </label>


          <label>
            data

            <input
              id="transactionDate"
              type="date"
              required
            >

          </label>


          <label>
            forma de pagamento

            <input
              id="transactionPayment"
            >

          </label>


          <button class="primary">
            salvar transação
          </button>

        </form>

      </div>


      <div class="panel">

        <h2>últimas transações</h2>

        <div id="transactionList">
          carregando...
        </div>

      </div>

    </div>
  `;


  $('#transactionDate').value =
    new Date().toISOString().slice(0, 10);


  $('#transactionForm').addEventListener(
    'submit',
    saveTransaction
  );

  loadTransactions();
}


async function saveTransaction(event) {

  event.preventDefault();

  try {

    await A.create(
      'transactions',
      {
        user_id: user.$id,
        type: $('#transactionType').value,
        amount: Number($('#transactionAmount').value),
        category: $('#transactionCategory').value,
        description: $('#transactionDescription').value,
        transaction_date: $('#transactionDate').value,
        payment_method: $('#transactionPayment').value,
        installments: 1,
        installment_number: 1
      },
      user.$id
    );

    toast('transação salva');

    event.target.reset();

    $('#transactionDate').value =
      new Date().toISOString().slice(0, 10);

    loadTransactions();

  } catch (error) {

    console.error(error);

    toast(error.message);
  }
}


async function loadTransactions() {

  const list = $('#transactionList');

  if (!list) return;

  try {

    const rows = await A.list('transactions');

    const mine = rows
      .filter(row =>
        row.data?.user_id === user.$id
      )
      .sort((a, b) =>
        String(b.data.transaction_date)
          .localeCompare(
            String(a.data.transaction_date)
          )
      );

    if (!mine.length) {

      list.innerHTML =
        '<p>nenhuma transação cadastrada.</p>';

      return;
    }

    list.innerHTML = mine.map(row => {

      const d = row.data;

      return `

        <div class="transaction">

          <div>

            <strong>
              ${escapeHtml(d.category || 'sem categoria')}
            </strong>

            <small>
              ${escapeHtml(d.description || '')}
            </small>

          </div>

          <strong>
            ${money(Number(d.amount) || 0)}
          </strong>

        </div>
      `;

    }).join('');

  } catch (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;
  }
}


/* =========================
   METAS
========================= */

function renderGoals() {

  const main = $('#main');

  main.innerHTML = `

    <div class="page">

      <h1>metas</h1>

      <div class="panel">

        <form id="goalForm">

          <label>
            nome da meta

            <input id="goalName" required>
          </label>

          <label>
            valor objetivo

            <input
              id="goalTarget"
              type="number"
              step="0.01"
              required
            >
          </label>

          <label>
            valor já guardado

            <input
              id="goalSaved"
              type="number"
              step="0.01"
              value="0"
            >
          </label>

          <label>
            data objetivo

            <input
              id="goalDate"
              type="date"
            >
          </label>

          <button class="primary">
            salvar meta
          </button>

        </form>

      </div>

      <div class="panel">

        <h2>suas metas</h2>

        <div id="goalList">
          carregando...
        </div>

      </div>

    </div>
  `;

  $('#goalForm').addEventListener(
    'submit',
    saveGoal
  );

  loadGoals();
}


async function saveGoal(event) {

  event.preventDefault();

  try {

    await A.create(
      'goals',
      {
        user_id: user.$id,
        name: $('#goalName').value,
        target_amount:
          Number($('#goalTarget').value),
        saved_amount:
          Number($('#goalSaved').value || 0),
        target_date:
          $('#goalDate').value,
        description: ''
      },
      user.$id
    );

    toast('meta criada');

    event.target.reset();

    loadGoals();

  } catch (error) {

    toast(error.message);
  }
}


async function loadGoals() {

  const list = $('#goalList');

  try {

    const rows = await A.list('goals');

    const mine = rows.filter(
      row => row.data?.user_id === user.$id
    );

    if (!mine.length) {

      list.innerHTML =
        '<p>nenhuma meta cadastrada.</p>';

      return;
    }

    list.innerHTML = mine.map(row => {

      const d = row.data;

      const target =
        Number(d.target_amount) || 0;

      const saved =
        Number(d.saved_amount) || 0;

      const percent =
        target > 0
          ? Math.min(100, (saved / target) * 100)
          : 0;

      return `

        <div class="goal">

          <strong>
            ${escapeHtml(d.name)}
          </strong>

          <p>
            ${money(saved)}
            de
            ${money(target)}
          </p>

          <div class="progress">
            <div style="width:${percent}%"></div>
          </div>

          <small>
            ${percent.toFixed(1)}%
          </small>

        </div>
      `;

    }).join('');

  } catch (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;
  }
}


/* =========================
   CONTAS
========================= */

function renderAccounts() {

  const main = $('#main');

  main.innerHTML = `

    <div class="page">

      <h1>contas</h1>

      <div class="panel">

        <form id="accountForm">

          <label>
            nome

            <input id="accountName" required>
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
            salvar conta
          </button>

        </form>

      </div>

      <div class="panel">

        <div id="accountList">
          carregando...
        </div>

      </div>

    </div>
  `;

  $('#accountForm').addEventListener(
    'submit',
    saveAccount
  );

  loadAccounts();
}


async function saveAccount(event) {

  event.preventDefault();

  try {

    await A.create(
      'accounts',
      {
        user_id: user.$id,
        name: $('#accountName').value,
        balance:
          Number($('#accountBalance').value || 0),
        due_day:
          Number($('#accountDue').value || 0),
        recurring: false
      },
      user.$id
    );

    toast('conta salva');

    event.target.reset();

    loadAccounts();

  } catch (error) {

    toast(error.message);
  }
}


async function loadAccounts() {

  const list = $('#accountList');

  try {

    const rows = await A.list('accounts');

    const mine = rows.filter(
      row => row.data?.user_id === user.$id
    );

    if (!mine.length) {

      list.innerHTML =
        '<p>nenhuma conta cadastrada.</p>';

      return;
    }

    list.innerHTML = mine.map(row => {

      const d = row.data;

      return `

        <div class="transaction">

          <strong>
            ${escapeHtml(d.name)}
          </strong>

          <strong>
            ${money(Number(d.balance) || 0)}
          </strong>

        </div>
      `;

    }).join('');

  } catch (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;
  }
}


/* =========================
   CARTÕES
========================= */

function renderCards() {

  const main = $('#main');

  main.innerHTML = `

    <div class="page">

      <h1>cartões</h1>

      <div class="panel">

        <form id="cardForm">

          <label>
            nome do cartão

            <input id="cardName" required>
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
            salvar cartão
          </button>

        </form>

      </div>

      <div class="panel">

        <div id="cardList">
          carregando...
        </div>

      </div>

    </div>
  `;

  $('#cardForm').addEventListener(
    'submit',
    saveCard
  );

  loadCards();
}


async function saveCard(event) {

  event.preventDefault();

  try {

    await A.create(
      'cards',
      {
        user_id: user.$id,
        name: $('#cardName').value,
        credit_limit:
          Number($('#cardLimit').value),
        current_bill:
          Number($('#cardBill').value || 0),
        closing_day:
          Number($('#cardClosing').value || 0),
        due_day:
          Number($('#cardDue').value || 0)
      },
      user.$id
    );

    toast('cartão salvo');

    event.target.reset();

    loadCards();

  } catch (error) {

    toast(error.message);
  }
}


async function loadCards() {

  const list = $('#cardList');

  try {

    const rows = await A.list('cards');

    const mine = rows.filter(
      row => row.data?.user_id === user.$id
    );

    if (!mine.length) {

      list.innerHTML =
        '<p>nenhum cartão cadastrado.</p>';

      return;
    }

    list.innerHTML = mine.map(row => {

      const d = row.data;

      return `

        <div class="transaction">

          <div>

            <strong>
              ${escapeHtml(d.name)}
            </strong>

            <small>
              fatura atual:
              ${money(Number(d.current_bill) || 0)}
            </small>

          </div>

          <strong>
            ${money(Number(d.credit_limit) || 0)}
          </strong>

        </div>
      `;

    }).join('');

  } catch (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;
  }
}


/* =========================
   CATEGORIAS
========================= */

function renderCategories() {

  const main = $('#main');

  main.innerHTML = `

    <div class="page">

      <h1>categorias</h1>

      <div class="panel">

        <form id="categoryForm">

          <label>
            nome

            <input id="categoryName" required>
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
              step="0.01"
              value="0"
            >
          </label>

          <button class="primary">
            salvar categoria
          </button>

        </form>

      </div>

      <div class="panel">

        <div id="categoryList">
          carregando...
        </div>

      </div>

    </div>
  `;

  $('#categoryForm').addEventListener(
    'submit',
    saveCategory
  );

  loadCategories();
}


async function saveCategory(event) {

  event.preventDefault();

  try {

    await A.create(
      'categories',
      {
        user_id: user.$id,
        name: $('#categoryName').value,
        icon:
          $('#categoryIcon').value || '◈',
        monthly_limit:
          Number($('#categoryLimit').value || 0)
      },
      user.$id
    );

    toast('categoria salva');

    event.target.reset();

    loadCategories();

  } catch (error) {

    toast(error.message);
  }
}


async function loadCategories() {

  const list = $('#categoryList');

  try {

    const rows =
      await A.list('categories');

    const mine =
      rows.filter(
        row =>
          row.data?.user_id === user.$id
      );

    if (!mine.length) {

      list.innerHTML =
        '<p>nenhuma categoria cadastrada.</p>';

      return;
    }

    list.innerHTML =
      mine.map(row => {

        const d = row.data;

        return `

          <div class="transaction">

            <div>

              <strong>
                ${escapeHtml(d.icon || '◈')}
                ${escapeHtml(d.name)}
              </strong>

              <small>
                limite:
                ${money(
                  Number(d.monthly_limit) || 0
                )}
              </small>

            </div>

          </div>
        `;

      }).join('');

  } catch (error) {

    list.innerHTML =
      `<p>${escapeHtml(error.message)}</p>`;
  }
}


/* =========================
   SALÁRIO
========================= */

function renderSalary() {

  const main = $('#main');

  main.innerHTML = `

    <div class="page">

      <h1>salário</h1>

      <div class="panel">

        <form id="salaryForm">

          <label>
            salário bruto

            <input
              id="salaryGross"
              type="number"
              step="0.01"
            >
          </label>

          <label>
            adiantamento %

            <input
              id="salaryAdvance"
              type="number"
              step="0.01"
            >
          </label>

          <label>
            INSS %

            <input
              id="salaryInss"
              type="number"
              step="0.01"
            >
          </label>

          <label>
            assistencial

            <input
              id="salaryAssist"
              type="number"
              step="0.01"
            >
          </label>

          <label>
            seguro de vida

            <input
              id="salaryLife"
              type="number"
              step="0.01"
            >
          </label>

          <label>
            negocial

            <input
              id="salaryNegocial"
              type="number"
              step="0.01"
            >
          </label>

          <button class="primary">
            calcular salário
          </button>

        </form>

      </div>

      <div class="panel">

        <h2>resultado</h2>

        <div id="salaryResult">
          preencha os dados.
        </div>

      </div>

    </div>
  `;

  loadSalary();

  $('#salaryForm').addEventListener(
    'submit',
    calculateSalary
  );
}


async function loadSalary() {

  try {

    const rows =
      await A.list('settings');

    const mine =
      rows.find(
        row =>
          row.data?.user_id === user.$id
      );

    if (!mine) return;

    const d = mine.data;

    $('#salaryGross').value =
      d.gross_salary ?? 2759.74;

    $('#salaryAdvance').value =
      d.advance_pct ?? 40;

    $('#salaryInss').value =
      d.inss_pct ?? 9;

    $('#salaryAssist').value =
      d.assist_pct ?? 2;

    $('#salaryLife').value =
      d.life_insurance ?? 3.82;

    $('#salaryNegocial').value =
      d.negocial ?? 21;

  } catch (error) {

    console.error(error);
  }
}


async function calculateSalary(event) {

  event.preventDefault();

  const gross =
    Number($('#salaryGross').value || 0);

  const advancePct =
    Number($('#salaryAdvance').value || 0);

  const inssPct =
    Number($('#salaryInss').value || 0);

  const assistPct =
    Number($('#salaryAssist').value || 0);

  const life =
    Number($('#salaryLife').value || 0);

  const negocial =
    Number($('#salaryNegocial').value || 0);


  const advance =
    gross * advancePct / 100;

  const inss =
    gross * inssPct / 100;

  const assist =
    gross * assistPct / 100;

  const liquid =
    gross -
    inss -
    assist -
    life -
    negocial;


  $('#salaryResult').innerHTML = `

    <div class="salary-result">

      <p>
        salário bruto
        <strong>
          ${money(gross)}
        </strong>
      </p>

      <p>
        adiantamento
        <strong>
          ${money(advance)}
        </strong>
      </p>

      <p>
        INSS
        <strong>
          ${money(inss)}
        </strong>
      </p>

      <p>
        assistencial
        <strong>
          ${money(assist)}
        </strong>
      </p>

      <p>
        seguro de vida
        <strong>
          ${money(life)}
        </strong>
      </p>

      <p>
        negocial
        <strong>
          ${money(negocial)}
        </strong>
      </p>

      <hr>

      <p>
        salário líquido estimado
        <strong>
          ${money(liquid)}
        </strong>
      </p>

    </div>
  `;


  try {

    const rows =
      await A.list('settings');

    const mine =
      rows.find(
        row =>
          row.data?.user_id === user.$id
      );

    const data = {
      user_id: user.$id,
      gross_salary: gross,
      advance_pct: advancePct,
      inss_pct: inssPct,
      assist_pct: assistPct,
      life_insurance: life,
      negocial
    };

    if (mine) {

      await A.update(
        'settings',
        mine.$id,
        data
      );

    } else {

      await A.create(
        'settings',
        data,
        user.$id
      );
    }

    toast('salário atualizado');

  } catch (error) {

    console.error(error);

    toast(
      'resultado calculado, mas não foi possível salvar.'
    );
  }
}


/* =========================
   BILLS
========================= */

async function loadBills() {

  try {

    return await A.list('bills');

  } catch (error) {

    console.error(error);

    return [];
  }
}


/* =========================
   INICIALIZAÇÃO
========================= */

async function startApp() {

  const hello = $('#hello');

  if (hello) {

    hello.textContent =
      `olá, ${user?.name || 'Mirela'}`;
  }

  renderHome();
}


(async function init() {

  loadTheme();

  try {

    user = await A.me();

    await ensureProfile();

    await ensureSettings();

    showApp();

    await startApp();

  } catch (error) {

    console.log(
      'nenhuma sessão ativa.'
    );

    showAuth();
  }

})();
