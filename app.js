/* HKR Tournaments V3 - Stable Supabase online client
   No secret/service_role key belongs here.
*/

const C = window.HKR_CONFIG || {};

let sb = null;
let currentUser = null;
let currentProfile = null;

let settings = {
  app_name: 'HKR Tournaments',
  upi_id: '',
  upi_name: 'HKR Tournaments',
  qr_url: '',
  support: 'Contact admin'
};

let appStarted = false;
let authListenerStarted = false;
let sessionLoading = false;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------------- BASIC HELPERS ---------------- */

function toast(message) {
  const e = $('#toast');
  if (!e) return;

  e.textContent = message;
  e.classList.add('show');

  clearTimeout(window.__hkrToastTimer);

  window.__hkrToastTimer = setTimeout(() => {
    e.classList.remove('show');
  }, 2800);
}

function esc(s = '') {
  return String(s).replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));
}

function money(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

/* ---------------- MODAL ---------------- */

function openModal(html) {
  const content = $('#modalContent');
  const modal = $('#modal');

  if (!content || !modal) return;

  content.innerHTML = html;
  modal.classList.remove('hidden');
}

function closeModal() {
  const modal = $('#modal');
  if (modal) modal.classList.add('hidden');
}

const closeModalButton = $('#closeModal');

if (closeModalButton) {
  closeModalButton.onclick = closeModal;
}

const modalElement = $('#modal');

if (modalElement) {
  modalElement.onclick = e => {
    if (e.target.id === 'modal') {
      closeModal();
    }
  };
}

/* ---------------- SUPABASE CLIENT ---------------- */

/*
  IMPORTANT:
  Supabase client is created ONLY ONCE.
*/

function ready() {

  if (
    !C.SUPABASE_URL ||
    C.SUPABASE_URL.includes('YOUR-PROJECT')
  ) {
    toast('Add your Supabase URL and publishable key in config.js');
    return false;
  }

  if (
    !C.SUPABASE_PUBLISHABLE_KEY
  ) {
    toast('Supabase publishable key is missing in config.js');
    return false;
  }

  if (!window.supabase) {
    toast('Supabase library is not loaded.');
    return false;
  }

  if (!sb) {
    sb = window.supabase.createClient(
      C.SUPABASE_URL,
      C.SUPABASE_PUBLISHABLE_KEY
    );
  }

  return true;
}

/* ---------------- SESSION ---------------- */

async function loadSession() {

  if (!ready()) return;

  /*
    Prevent multiple simultaneous session loads.
  */
  if (sessionLoading) return;

  sessionLoading = true;

  try {

    const {
      data,
      error
    } = await sb.auth.getSession();

    if (error) {
      console.error('Session error:', error);
      return;
    }

    const session = data?.session || null;

    currentUser = session?.user || null;

    if (currentUser) {
      await loadProfile();
    } else {
      currentProfile = null;
    }

    updateNav();

    await loadSettings();

    await loadTournaments();
    await loadMatches();
    await loadWallet();

  } catch (err) {

    console.error('loadSession error:', err);

  } finally {

    sessionLoading = false;
  }
}

/* ---------------- PROFILE ---------------- */

async function loadProfile() {

  if (!currentUser || !sb) {
    currentProfile = null;
    return;
  }

  try {

    const {
      data,
      error
    } = await sb
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (error) {
      console.error('Profile load error:', error);
      currentProfile = null;
      return;
    }

    currentProfile = data || null;

  } catch (err) {

    console.error('Profile exception:', err);
    currentProfile = null;
  }
}

/* ---------------- SETTINGS ---------------- */

async function loadSettings() {

  if (!sb) return;

  try {

    const {
      data,
      error
    } = await sb
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('Settings load error:', error);
      return;
    }

    if (data) {
      settings = {
        ...settings,
        ...data
      };
    }

  } catch (err) {

    console.error('Settings exception:', err);
  }
}

/* ---------------- NAVIGATION ---------------- */

function updateNav() {

  const authBtn = $('#authBtn');
  const adminNav = $('#adminNav');

  if (authBtn) {
    authBtn.textContent = currentUser
      ? 'Logout'
      : 'Login';
  }

  if (adminNav) {

    const admin =
      !!(
        currentUser &&
        currentProfile &&
        currentProfile.role === 'admin'
      );

    adminNav.classList.toggle(
      'hidden',
      !admin
    );
  }
}

/* ---------------- AUTH BUTTON ---------------- */

function bindAuthButton() {

  const authBtn = $('#authBtn');

  if (!authBtn) return;

  authBtn.onclick = async () => {

    if (!ready()) return;

    if (currentUser) {

      try {

        await sb.auth.signOut();

      } catch (err) {

        console.error(
          'Sign out error:',
          err
        );
      }

      currentUser = null;
      currentProfile = null;

      updateNav();

      showPage('home');

      loadMatches();
      loadWallet();

      toast('Signed out');

      return;
    }

    /*
      auth-update.js provides the modern
      Login / Forgot Password screen.
    */

    if (
      window.HKRAuth &&
      typeof window.HKRAuth.login === 'function'
    ) {

      window.HKRAuth.login();

    } else {

      openLogin();
    }
  };
}

/* ---------------- FALLBACK LOGIN ---------------- */

function openLogin() {

  openModal(`
    <h2>Login</h2>

    <form id="authForm" class="form">

      <label>Email</label>

      <input
        id="email"
        type="email"
        required
        autocomplete="email"
      >

      <label>Password</label>

      <input
        id="password"
        type="password"
        minlength="6"
        required
        autocomplete="current-password"
      >

      <button
        class="primary"
        type="submit"
      >
        Login
      </button>

    </form>
  `);

  const form = $('#authForm');

  if (!form) return;

  form.onsubmit = async e => {

    e.preventDefault();

    if (!ready()) return;

    const email =
      $('#email').value.trim();

    const password =
      $('#password').value;

    const {
      error
    } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast(error.message);
      return;
    }

    closeModal();

    toast('Welcome back');

    await loadSession();
  };
}

/* ---------------- PAGE NAVIGATION ---------------- */

function showPage(id) {

  $$('.page').forEach(page => {
    page.classList.remove('active');
  });

  const page = $('#' + id);

  if (!page) return;

  page.classList.add('active');

  if (id === 'matches') {
    loadMatches();
  }

  if (id === 'wallet') {
    loadWallet();
  }

  if (id === 'admin') {
    loadAdmin('tournaments');
  }
}

$$('[data-page]').forEach(button => {

  button.onclick = () => {
    showPage(button.dataset.page);
  };

});

const refreshBtn = $('#refreshBtn');

if (refreshBtn) {

  refreshBtn.onclick = async () => {

    toast('Refreshing...');

    await loadTournaments();

    if (currentUser) {
      await loadMatches();
      await loadWallet();
    }

    toast('Refreshed');
  };
}

/* ---------------- TOURNAMENTS ---------------- */

async function loadTournaments() {

  if (!ready()) return;

  const box = $('#tournamentGrid');

  if (!box) return;

  try {

    const {
      data,
      error
    } = await sb
      .from('tournaments')
      .select('*')
      .eq('published', true)
      .order('start_at', {
        ascending: true
      });

    if (error) {

      console.error(
        'Tournament load error:',
        error
      );

      box.innerHTML = `
        <div class="card">
          Could not load tournaments.
          Check Supabase setup.
        </div>
      `;

      return;
    }

    box.innerHTML =
      (data || [])
        .map(t => `

          <article class="card tcard">

            <span class="badge">
              ${esc(t.status || 'OPEN')}
            </span>

            <h3>
              ${esc(t.title)}
            </h3>

            <p class="muted">
              ${esc(t.mode || 'Squad')}
              •
              ${esc(t.map_name || 'Bermuda')}
            </p>

            <div class="meta">

              <div>
                <small class="muted">
                  Entry
                </small>
                <br>
                <b class="price">
                  ${money(t.entry_fee)}
                </b>
              </div>

              <div>
                <small class="muted">
                  Prize
                </small>
                <br>
                <b>
                  ${money(t.prize_pool)}
                </b>
              </div>

              <div>
                <small class="muted">
                  Slots
                </small>
                <br>
                <b>
                  ${t.slots || 0}
                </b>
              </div>

              <div>
                <small class="muted">
                  Starts
                </small>
                <br>
                <b>
                  ${new Date(
                    t.start_at
                  ).toLocaleString()}
                </b>
              </div>

            </div>

            <button
              class="primary"
              onclick="joinTournament('${t.id}')"
            >
              Join Tournament
            </button>

          </article>

        `)
        .join('')

      ||

      `
        <div class="card">
          No tournaments yet.
        </div>
      `;

  } catch (err) {

    console.error(
      'Tournament exception:',
      err
    );
  }
}

/* ---------------- JOIN TOURNAMENT ---------------- */

window.joinTournament = async id => {

  if (!currentUser) {

    if (
      window.HKRAuth &&
      typeof window.HKRAuth.login === 'function'
    ) {
      window.HKRAuth.login();
    } else {
      openLogin();
    }

    return;
  }

  const {
    data: tournament,
    error
  } = await sb
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !tournament) {

    toast(
      error?.message ||
      'Tournament not found'
    );

    return;
  }

  const upi = settings.upi_id;
  const qr = settings.qr_url;

  openModal(`

    <h2>
      ${esc(tournament.title)}
    </h2>

    <p>
      ${esc(
        tournament.description ||
        'Join this tournament.'
      )}
    </p>

    <div class="meta">

      <div>
        Entry
        <br>
        <b class="price">
          ${money(tournament.entry_fee)}
        </b>
      </div>

      <div>
        Prize
        <br>
        <b>
          ${money(tournament.prize_pool)}
        </b>
      </div>

    </div>

    <div class="card">

      <b>Payment</b>

      <p class="muted">
        Pay to
        ${esc(settings.upi_name)}
        ${
          upi
            ? ' • ' + esc(upi)
            : ''
        }
      </p>

      ${
        qr
          ? `
            <img
              class="qr"
              src="${esc(qr)}"
              alt="UPI QR"
            >
          `
          : ''
      }

      ${
        upi
          ? `
            <a
              class="primary"
              style="
                display:block;
                text-align:center;
                text-decoration:none
              "
              href="upi://pay?pa=${encodeURIComponent(
                upi
              )}&pn=${encodeURIComponent(
                settings.upi_name
              )}&am=${encodeURIComponent(
                tournament.entry_fee
              )}&cu=INR"
            >
              Open UPI App
            </a>
          `
          : ''
      }

    </div>

    <form
      id="joinForm"
      class="form"
    >

      <label>
        Free Fire UID
      </label>

      <input
        id="ffuid"
        required
      >

      <label>
        In-game name
      </label>

      <input
        id="ign"
        required
      >

      <label>
        UTR / Transaction ID
      </label>

      <input
        id="utr"
        required
      >

      <button
        class="primary"
        type="submit"
      >
        Submit Join Request
      </button>

    </form>

  `);

  const form = $('#joinForm');

  if (!form) return;

  form.onsubmit = async e => {

    e.preventDefault();

    const ffuid =
      $('#ffuid').value.trim();

    const ign =
      $('#ign').value.trim();

    const utr =
      $('#utr').value.trim();

    const {
      data: registration,
      error: registrationError
    } = await sb
      .from('registrations')
      .insert({
        tournament_id: id,
        user_id: currentUser.id,
        ff_uid: ffuid,
        ign,
        status: 'pending'
      })
      .select()
      .single();

    if (registrationError) {

      toast(
        registrationError.message
      );

      return;
    }

    const {
      error: paymentError
    } = await sb
      .from('payments')
      .insert({
        registration_id: registration.id,
        tournament_id: id,
        user_id: currentUser.id,
        amount: tournament.entry_fee,
        utr,
        status: 'pending'
      });

    if (paymentError) {

      toast(
        paymentError.message
      );

      return;
    }

    toast(
      'Join request submitted'
    );

    closeModal();

    loadMatches();
  };
};

/* ---------------- MATCHES ---------------- */

async function loadMatches() {

  const box = $('#matchesList');

  if (!box) return;

  if (!currentUser) {

    box.innerHTML = `
      <div class="card">
        Login to see your matches.
      </div>
    `;

    return;
  }

  try {

    const {
      data,
      error
    } = await sb
      .from('registrations')
      .select(
        '*, tournaments(*)'
      )
      .eq(
        'user_id',
        currentUser.id
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );

    if (error) {

      box.innerHTML = `
        <div class="card">
          ${esc(error.message)}
        </div>
      `;

      return;
    }

    box.innerHTML =
      (data || [])
        .map(r => `

          <div class="card">

            <div class="row">

              <div>

                <b>
                  ${esc(
                    r.tournaments?.title ||
                    'Tournament'
                  )}
                </b>

                <div class="muted">
                  ${esc(r.ign)}
                  • UID
                  ${esc(r.ff_uid)}
                </div>

              </div>

              <span class="badge">
                ${esc(r.status)}
              </span>

            </div>

            ${
              r.tournaments?.room_id &&
              r.status === 'approved'

                ? `

                  <p>

                    Room ID:
                    <b>
                      ${esc(
                        r.tournaments.room_id
                      )}
                    </b>

                    <br>

                    Room Password:
                    <b>
                      ${esc(
                        r.tournaments.room_password ||
                        ''
                      )}
                    </b>

                  </p>

                `

                : `

                  <p class="muted">
                    Room details appear
                    after admin approval.
                  </p>

                `
            }

          </div>

        `)
        .join('')

      ||

      `
        <div class="card">
          No matches yet.
        </div>
      `;

  } catch (err) {

    console.error(
      'Matches error:',
      err
    );
  }
}

/* ---------------- WALLET ---------------- */

async function loadWallet() {

  const box = $('#walletBox');

  if (!box) return;

  if (!currentUser) {

    box.innerHTML = `
      <p class="muted">
        Login to view wallet.
      </p>
    `;

    return;
  }

  try {

    const {
      data,
      error
    } = await sb
      .from('wallet_transactions')
      .select('*')
      .eq(
        'user_id',
        currentUser.id
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );

    if (error) {

      box.innerHTML = `
        <p class="muted">
          ${esc(error.message)}
        </p>
      `;

      return;
    }

    const balance =
      (data || []).reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount || 0
          ),
        0
      );

    box.innerHTML = `

      <h2>
        ${money(balance)}
      </h2>

      <p class="muted">
        Balance from approved
        admin transactions.
      </p>

    ` +

      (data || [])
        .map(x => `

          <div class="row">

            <span>
              ${esc(
                x.note ||
                'Transaction'
              )}
            </span>

            <b>
              ${money(x.amount)}
            </b>

          </div>

        `)
        .join('');

  } catch (err) {

    console.error(
      'Wallet error:',
      err
    );
  }
}

/* ---------------- ADMIN CHECK ---------------- */

function isAdmin() {

  return !!(
    currentUser &&
    currentProfile &&
    currentProfile.role === 'admin'
  );
}

/* ---------------- ADMIN ---------------- */

async function loadAdmin(tab = 'tournaments') {

  if (!isAdmin()) {

    showPage('home');

    toast(
      'Admin access required'
    );

    return;
  }

  const container =
    $('#adminContent');

  if (!container) return;

  if (tab === 'tournaments') {

    const {
      data,
      error
    } = await sb
      .from('tournaments')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false
        }
      );

    if (error) {

      container.innerHTML = `
        <div class="card">
          ${esc(error.message)}
        </div>
      `;

      return;
    }

    container.innerHTML = `

      <div class="row">

        <h3>
          Tournaments
        </h3>

        <button
          class="primary"
          style="width:auto"
          onclick="newTournament()"
        >
          + Create
        </button>

      </div>

      ${
        (data || [])
          .map(t => `

            <div class="card">

              <div class="row">

                <div>

                  <b>
                    ${esc(t.title)}
                  </b>

                  <div class="muted">

                    ${new Date(
                      t.start_at
                    ).toLocaleString()}

                    •
                    ${money(t.entry_fee)}

                    •
                    ${esc(t.status)}

                  </div>

                </div>

                <div class="actions">

                  <button
                    onclick="editTournament('${t.id}')"
                  >
                    Edit
                  </button>

                  <button
                    onclick="deleteTournament('${t.id}')"
                  >
                    Delete
                  </button>

                </div>

              </div>

            </div>

          `)
          .join('')
      }

    `;
  }

  if (tab === 'payments') {

    const {
      data,
      error
    } = await sb
      .from('payments')
      .select(
        '*, registrations(ign,ff_uid), tournaments(title)'
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      );

    if (error) {

      container.innerHTML = `
        <div class="card">
          ${esc(error.message)}
        </div>
      `;

      return;
    }

    container.innerHTML = `

      <div class="card">

        <table class="table">

          <tr>

            <th>
              Tournament
            </th>

            <th>
              Player
            </th>

            <th>
              UTR
            </th>

            <th>
              Amount
            </th>

            <th>
              Status
            </th>

            <th>
              Action
            </th>

          </tr>

          ${
            (data || [])
              .map(p => `

                <tr>

                  <td>
                    ${esc(
                      p.tournaments?.title
                    )}
                  </td>

                  <td>
                    ${esc(
                      p.registrations?.ign
                    )}

                    <br>

                    ${esc(
                      p.registrations?.ff_uid
                    )}
                  </td>

                  <td>
                    ${esc(p.utr)}
                  </td>

                  <td>
                    ${money(p.amount)}
                  </td>

                  <td>
                    ${esc(p.status)}
                  </td>

                  <td>

                    ${
                      p.status === 'pending'

                        ? `

                          <button
                            onclick="approvePayment(
                              '${p.id}',
                              '${p.registration_id}'
                            )"
                          >
                            Approve
                          </button>

                          <button
                            onclick="rejectPayment(
                              '${p.id}',
                              '${p.registration_id}'
                            )"
                          >
                            Reject
                          </button>

                        `

                        : '-'
                    }

                  </td>

                </tr>

              `)
              .join('')
          }

        </table>

      </div>

    `;
  }

  if (tab === 'settings') {

    container.innerHTML = `

      <form
        id="settingsForm"
        class="card form"
      >

        <h3>
          App & Payment Settings
        </h3>

        <label>
          App name
        </label>

        <input
          id="sname"
          value="${esc(
            settings.app_name
          )}"
        >

        <label>
          UPI ID
        </label>

        <input
          id="supi"
          value="${esc(
            settings.upi_id
          )}"
        >

        <label>
          UPI account name
        </label>

        <input
          id="suname"
          value="${esc(
            settings.upi_name
          )}"
        >

        <label>
          QR image URL
        </label>

        <input
          id="sqr"
          value="${esc(
            settings.qr_url
          )}"
        >

        <label>
          Support text
        </label>

        <textarea
          id="ssupport"
        >${esc(settings.support)}</textarea>

        <button
          class="primary"
          type="submit"
        >
          Save Settings
        </button>

      </form>

    `;

    const form =
      $('#settingsForm');

    if (!form) return;

    form.onsubmit =
      async e => {

        e.preventDefault();

        const values = {

          app_name:
            $('#sname').value,

          upi_id:
            $('#supi').value,

          upi_name:
            $('#suname').value,

          qr_url:
            $('#sqr').value,

          support:
            $('#ssupport').value
        };

        const {
          error
        } = await sb
          .from('app_settings')
          .update(values)
          .eq('id', 1);

        if (error) {

          toast(
            error.message
          );

          return;
        }

        settings = {
          ...settings,
          ...values
        };

        toast(
          'Settings saved'
        );
      };
  }
}

/* ---------------- ADMIN TABS ---------------- */

$$('[data-admin-tab]').forEach(button => {

  button.onclick = () => {

    loadAdmin(
      button.dataset.adminTab
    );

  };

});

/* ---------------- CREATE / EDIT TOURNAMENT ---------------- */

window.newTournament = () => {

  openTournamentForm();

};

window.editTournament = async id => {

  const {
    data,
    error
  } = await sb
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {

    toast(
      error.message
    );

    return;
  }

  openTournamentForm(data);
};

function openTournamentForm(t = {}) {

  openModal(`

    <h2>
      ${t.id ? 'Edit' : 'Create'}
      Tournament
    </h2>

    <form
      id="tf"
      class="form"
    >

      <input
        type="hidden"
        id="tid"
        value="${esc(t.id || '')}"
      >

      <label>
        Title
      </label>

      <input
        id="tt"
        required
        value="${esc(t.title || '')}"
      >

      <label>
        Description
      </label>

      <textarea id="td">${esc(
        t.description || ''
      )}</textarea>

      <label>
        Mode
      </label>

      <input
        id="tm"
        value="${esc(
          t.mode || 'Squad'
        )}"
      >

      <label>
        Map
      </label>

      <input
        id="tmap"
        value="${esc(
          t.map_name || 'Bermuda'
        )}"
      >

      <label>
        Entry fee
      </label>

      <input
        id="te"
        type="number"
        min="0"
        value="${t.entry_fee || 0}"
      >

      <label>
        Prize pool
      </label>

      <input
        id="tp"
        type="number"
        min="0"
        value="${t.prize_pool || 0}"
      >

      <label>
        Slots
      </label>

      <input
        id="ts"
        type="number"
        min="1"
        value="${t.slots || 48}"
      >

      <label>
        Start time
      </label>

      <input
        id="ta"
        type="datetime-local"
        required
        value="${
          t.start_at
            ? new Date(
                t.start_at
              )
                .toISOString()
                .slice(0, 16)
            : ''
        }"
      >

      <label>
        Room ID
      </label>

      <input
        id="tri"
        value="${esc(
          t.room_id || ''
        )}"
      >

      <label>
        Room Password
      </label>

      <input
        id="trp"
        value="${esc(
          t.room_password || ''
        )}"
      >

      <label>
        Status
      </label>

      <select id="tstatus">

        <option
          ${
            t.status === 'open'
              ? 'selected'
              : ''
          }
        >
          open
        </option>

        <option
          ${
            t.status === 'full'
              ? 'selected'
              : ''
          }
        >
          full
        </option>

        <option
          ${
            t.status === 'completed'
              ? 'selected'
              : ''
          }
        >
          completed
        </option>

        <option
          ${
            t.status === 'cancelled'
              ? 'selected'
              : ''
          }
        >
          cancelled
        </option>

      </select>

      <label>

        <input
          id="tpub"
          type="checkbox"
          ${
            t.published !== false
              ? 'checked'
              : ''
          }
        >

        Published

      </label>

      <button
        class="primary"
        type="submit"
      >
        Save
      </button>

    </form>

  `);

  const form = $('#tf');

  if (!form) return;

  form.onsubmit =
    async e => {

      e.preventDefault();

      const startValue =
        $('#ta').value;

      const startDate =
        new Date(startValue);

      if (
        !startValue ||
        Number.isNaN(
          startDate.getTime()
        )
      ) {

        toast(
          'Please select a valid start time.'
        );

        return;
      }

      const values = {

        title:
          $('#tt').value.trim(),

        description:
          $('#td').value.trim(),

        mode:
          $('#tm').value.trim(),

        map_name:
          $('#tmap').value.trim(),

        entry_fee:
          Number(
            $('#te').value
          ),

        prize_pool:
          Number(
            $('#tp').value
          ),

        slots:
          Number(
            $('#ts').value
          ),

        start_at:
          startDate.toISOString(),

        room_id:
          $('#tri').value.trim(),

        room_password:
          $('#trp').value.trim(),

        status:
          $('#tstatus').value,

        published:
          $('#tpub').checked
      };

      const id =
        $('#tid').value;

      let result;

      if (id) {

        result =
          await sb
            .from('tournaments')
            .update(values)
            .eq('id', id);

      } else {

        result =
          await sb
            .from('tournaments')
            .insert(values);
      }

      if (result.error) {

        toast(
          result.error.message
        );

        return;
      }

      toast(
        'Tournament saved'
      );

      closeModal();

      await loadAdmin(
        'tournaments'
      );

      await loadTournaments();
    };
}

/* ---------------- DELETE TOURNAMENT ---------------- */

window.deleteTournament = async id => {

  if (
    !confirm(
      'Delete this tournament?'
    )
  ) {
    return;
  }

  const {
    error
  } = await sb
    .from('tournaments')
    .delete()
    .eq('id', id);

  if (error) {

    toast(
      error.message
    );

    return;
  }

  toast(
    'Deleted'
  );

  await loadAdmin(
    'tournaments'
  );

  await loadTournaments();
};

/* ---------------- PAYMENT APPROVE ---------------- */

window.approvePayment =
  async (
    paymentId,
    registrationId
  ) => {

    let result =
      await sb
        .from('payments')
        .update({
          status: 'approved',
          reviewed_at:
            new Date().toISOString()
        })
        .eq(
          'id',
          paymentId
        );

    if (!result.error) {

      result =
        await sb
          .from('registrations')
          .update({
            status: 'approved'
          })
          .eq(
            'id',
            registrationId
          );
    }

    toast(
      result.error
        ? result.error.message
        : 'Payment approved'
    );

    await loadAdmin(
      'payments'
    );

    await loadMatches();
  };

/* ---------------- PAYMENT REJECT ---------------- */

window.rejectPayment =
  async (
    paymentId,
    registrationId
  ) => {

    let result =
      await sb
        .from('payments')
        .update({
          status: 'rejected',
          reviewed_at:
            new Date().toISOString()
        })
        .eq(
          'id',
          paymentId
        );

    if (!result.error) {

      result =
        await sb
          .from('registrations')
          .update({
            status: 'rejected'
          })
          .eq(
            'id',
            registrationId
          );
    }

    toast(
      result.error
        ? result.error.message
        : 'Payment rejected'
    );

    await loadAdmin(
      'payments'
    );
  };

/* ---------------- ADMIN LOGOUT ---------------- */

const adminLogout =
  $('#adminLogout');

if (adminLogout) {

  adminLogout.onclick =
    async () => {

      if (!ready()) return;

      try {

        await sb.auth.signOut();

      } catch (err) {

        console.error(
          'Admin logout error:',
          err
        );
      }

      currentUser = null;
      currentProfile = null;

      updateNav();

      showPage('home');

      await loadMatches();
      await loadWallet();

      toast(
        'Signed out'
      );
    };
}

/* ---------------- AUTH STATE LISTENER ---------------- */

function setupAuthListener() {

  if (!ready()) return;

  if (authListenerStarted) {
    return;
  }

  authListenerStarted = true;

  sb.auth.onAuthStateChange(
    async event => {

      console.log(
        'HKR Auth event:',
        event
      );

      /*
        Logout is handled immediately.
      */

      if (event === 'SIGNED_OUT') {

        currentUser = null;
        currentProfile = null;

        updateNav();

        await loadMatches();
        await loadWallet();

        showPage('home');

        return;
      }

      /*
        Login/session/token changes.
        Small delay prevents QuickEdit
        localhost event racing.
      */

      if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {

        setTimeout(
          () => {
            loadSession();
          },
          100
        );
      }

      /*
        PASSWORD_RECOVERY is intentionally
        handled by auth-update.js.
      */
    }
  );
}

/* ---------------- START APP ---------------- */

async function startApp() {

  if (appStarted) return;

  appStarted = true;

  if (!ready()) return;

  setupAuthListener();

  /*
    Initial session.
  */

  await loadSession();

  /*
    auth-update.js loads after app.js.
    Give it time to install its login UI,
    then bind our stable auth button.
  */

  setTimeout(
    bindAuthButton,
    300
  );

  setTimeout(
    bindAuthButton,
    1000
  );

  setTimeout(
    bindAuthButton,
    2000
  );
}

/* ---------------- DOM START ---------------- */

if (
  document.readyState === 'loading'
) {

  document.addEventListener(
    'DOMContentLoaded',
    startApp,
    {
      once: true
    }
  );

} else {

  startApp();
}

/*
  auth-update.js uses this function
  after login/password recovery.
*/

window.loadSession =
  loadSession;