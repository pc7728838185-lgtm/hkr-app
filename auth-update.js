/* HKR Tournaments V3 - Authentication */
(function(){
"use strict";

const C = window.HKR_CONFIG || {};
let sb = null;

const $ = s => document.querySelector(s);

function toast(message){
  const t = $("#toast");
  if(!t) return;

  t.textContent = message;
  t.style.display = "block";

  clearTimeout(window.__hkrT);
  window.__hkrT = setTimeout(() => {
    t.style.display = "none";
  }, 2800);
}

function redirectUrl(){
  return location.origin + location.pathname;
}

function client(){
  if(sb) return sb;

  if(
    !window.supabase ||
    !C.SUPABASE_URL ||
    !C.SUPABASE_PUBLISHABLE_KEY
  ){
    toast("Supabase configuration is missing.");
    return null;
  }

  sb = window.supabase.createClient(
    C.SUPABASE_URL,
    C.SUPABASE_PUBLISHABLE_KEY
  );

  return sb;
}

function modal(html){
  const content = $("#modalContent");
  const m = $("#modal");

  if(!content || !m) return;

  content.innerHTML = html;
  m.classList.remove("hidden");
}

function closeModal(){
  const m = $("#modal");
  if(m) m.classList.add("hidden");
}


/* =========================
   LOGIN
========================= */

function login(){

  modal(`
    <h2>Login</h2>

    <form id="hkrLogin">

      <label>Email ID</label>
      <input
        id="loginEmail"
        type="email"
        required
        autocomplete="email"
        placeholder="Enter your email"
      >

      <label>Password</label>
      <input
        id="loginPassword"
        type="password"
        required
        autocomplete="current-password"
        placeholder="Enter your password"
      >

      <button class="btn" type="submit">
        Login
      </button>

    </form>

    <div class="auth-actions">

      <button class="auth-link" id="forgotBtn">
        Forgot Password?
      </button>

      <button class="auth-link" id="signupBtn">
        Create New Account
      </button>

    </div>
  `);

  $("#hkrLogin").onsubmit = async function(e){
    e.preventDefault();

    const s = client();
    if(!s) return;

    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;

    const { data, error } =
      await s.auth.signInWithPassword({
        email,
        password
      });

    if(error){
      toast(error.message);
      return;
    }

    closeModal();

    toast("Login successful.");

    if(window.loadSession){
      window.loadSession();
    }

    showApp();
  };

  $("#forgotBtn").onclick = forgot;
  $("#signupBtn").onclick = signup;
}


/* =========================
   SIGN UP
========================= */

function signup(){

  modal(`
    <h2>Create New Account</h2>

    <form id="hkrSignup">

      <label>Refer ID</label>
      <input
        id="signupRefer"
        type="text"
        maxlength="50"
        required
        placeholder="Enter Refer ID"
      >

      <label>Mobile Number</label>
      <input
        id="signupPhone"
        type="tel"
        maxlength="15"
        required
        autocomplete="tel"
        placeholder="Enter mobile number"
      >

      <label>Email ID</label>
      <input
        id="signupEmail"
        type="email"
        required
        autocomplete="email"
        placeholder="Enter email address"
      >

      <label>Name</label>
      <input
        id="signupName"
        type="text"
        maxlength="60"
        required
        autocomplete="name"
        placeholder="Enter your name"
      >

      <label>Create Password</label>
      <input
        id="signupPassword"
        type="password"
        minlength="6"
        required
        autocomplete="new-password"
        placeholder="Create password"
      >

      <label>Confirm Password</label>
      <input
        id="signupConfirm"
        type="password"
        minlength="6"
        required
        autocomplete="new-password"
        placeholder="Confirm password"
      >

      <button class="btn" type="submit">
        Sign Up
      </button>

    </form>

    <div class="auth-actions">
      <button class="auth-link" id="backLogin">
        Already have an account? Login
      </button>
    </div>

    <div class="auth-note">
      If email confirmation is enabled, check your email after signing up.
    </div>
  `);

  $("#hkrSignup").onsubmit = async function(e){
    e.preventDefault();

    const s = client();
    if(!s) return;

    const referId = $("#signupRefer").value.trim();
    const phone = $("#signupPhone").value.trim();
    const email = $("#signupEmail").value.trim();
    const name = $("#signupName").value.trim();
    const password = $("#signupPassword").value;
    const confirm = $("#signupConfirm").value;

    if(password !== confirm){
      toast("Passwords do not match.");
      return;
    }

    if(password.length < 6){
      toast("Password must be at least 6 characters.");
      return;
    }

    const { data, error } =
      await s.auth.signUp({
        email,
        password,
        options:{
          data:{
            player_name: name,
            full_name: name,
            phone: phone,
            refer_id: referId
          }
        }
      });

    if(error){
      toast(error.message);
      return;
    }

    /*
      If email confirmation is OFF,
      Supabase gives us a session immediately.
    */

    if(data && data.session && data.user){

      await ensureProfile(data.user);

      closeModal();

      toast("Account created successfully.");

      if(window.loadSession){
        window.loadSession();
      }

      showApp();

    }else{

      /*
        If email confirmation is ON,
        user must confirm email first.
      */

      toast("Account created. Check your email.");

      setTimeout(() => {
        login();
      }, 1200);
    }
  };

  $("#backLogin").onclick = login;
}


/* =========================
   SAVE PROFILE
========================= */

async function ensureProfile(user){

  if(!user) return;

  const s = client();
  if(!s) return;

  const meta = user.user_metadata || {};

  const profile = {
    id: user.id,
    name: meta.player_name || meta.full_name || "",
    phone: meta.phone || "",
    email: user.email || "",
    refer_id: meta.refer_id || ""
  };

  const { error } =
    await s
      .from("profiles")
      .upsert(profile, {
        onConflict: "id"
      });

  if(error){
    console.error("Profile save error:", error);
  }
}


/* =========================
   FORGOT PASSWORD
========================= */

function forgot(){

  modal(`
    <h2>Forgot Password</h2>

    <p>
      Enter your registered email ID.
      We will send you a password reset link.
    </p>

    <form id="hkrForgot">

      <label>Email ID</label>

      <input
        id="forgotEmail"
        type="email"
        required
        autocomplete="email"
        placeholder="Enter your email"
      >

      <button class="btn" type="submit">
        Send Reset Link
      </button>

    </form>

    <div class="auth-actions">
      <button class="auth-link" id="forgotBack">
        Back to Login
      </button>
    </div>
  `);

  $("#hkrForgot").onsubmit = async function(e){
    e.preventDefault();

    const s = client();
    if(!s) return;

    const email = $("#forgotEmail").value.trim();

    const { error } =
      await s.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: redirectUrl()
        }
      );

    if(error){
      toast(error.message);
      return;
    }

    toast("Reset link sent. Check your email.");

    setTimeout(() => {
      login();
    }, 1200);
  };

  $("#forgotBack").onclick = login;
}


/* =========================
   RESET PASSWORD
========================= */

function reset(){

  modal(`
    <h2>Set New Password</h2>

    <p>Choose a new password for your account.</p>

    <form id="hkrReset">

      <label>New Password</label>

      <input
        id="resetPassword1"
        type="password"
        minlength="6"
        required
        autocomplete="new-password"
        placeholder="New password"
      >

      <label>Confirm Password</label>

      <input
        id="resetPassword2"
        type="password"
        minlength="6"
        required
        autocomplete="new-password"
        placeholder="Confirm password"
      >

      <button class="btn" type="submit">
        Update Password
      </button>

    </form>
  `);

  $("#hkrReset").onsubmit = async function(e){
    e.preventDefault();

    const p1 = $("#resetPassword1").value;
    const p2 = $("#resetPassword2").value;

    if(p1 !== p2){
      toast("Passwords do not match.");
      return;
    }

    const s = client();
    if(!s) return;

    const { error } =
      await s.auth.updateUser({
        password: p1
      });

    if(error){
      toast(error.message);
      return;
    }

    closeModal();

    toast("Password updated successfully.");

    showLogin();
  };
}


/* =========================
   AUTH GATE
========================= */

function showApp(){

  const gate = $("#authGate");

  if(gate){
    gate.classList.add("hidden");
  }
}

function showLogin(){

  const gate = $("#authGate");

  if(gate){
    gate.classList.remove("hidden");
  }
}


/* =========================
   INSTALL
========================= */

function install(){

  const gateLogin = $("#gateLogin");
  const gateSignup = $("#gateSignup");

  /*
    Login button on first screen
  */

  if(gateLogin){
    gateLogin.onclick = login;
  }

  /*
    Create account button on first screen
  */

  if(gateSignup){
    gateSignup.onclick = signup;
  }


  /*
    Header Login / Logout button
  */

  const authBtn = $("#authBtn");

  if(authBtn){

    authBtn.onclick = async function(){

      const s = client();
      if(!s) return;

      const { data } = await s.auth.getSession();

      if(data && data.session){

        await s.auth.signOut();

        toast("Signed out.");

        showLogin();

        if(window.loadSession){
          window.loadSession();
        }

      }else{

        login();

      }
    };
  }


  /*
    Close modal button
  */

  const closeBtn = $("#closeModal");

  if(closeBtn){
    closeBtn.onclick = closeModal;
  }


  const s = client();

  if(!s) return;


  /*
    Supabase authentication events
  */

  s.auth.onAuthStateChange(function(event, session){

    setTimeout(async function(){

      if(event === "PASSWORD_RECOVERY"){

        reset();

        return;
      }


      if(event === "SIGNED_IN"){

        if(session && session.user){
          await ensureProfile(session.user);
        }

        showApp();

        if(window.loadSession){
          window.loadSession();
        }

        return;
      }


      if(event === "SIGNED_OUT"){

        showLogin();

        if(window.loadSession){
          window.loadSession();
        }

      }

    }, 0);
  });


  /*
    Check existing login session
  */

  s.auth.getSession().then(async function(result){

    const session = result.data && result.data.session;

    if(session && session.user){

      await ensureProfile(session.user);

      showApp();

      if(window.loadSession){
        window.loadSession();
      }

    }else{

      showLogin();

    }

    /*
      Password recovery link
    */

    if(
      location.hash &&
      /type=recovery/i.test(location.hash)
    ){
      setTimeout(reset, 0);
    }

  });

}


/* =========================
   START
========================= */

if(document.readyState === "loading"){

  document.addEventListener(
    "DOMContentLoaded",
    install
  );

}else{

  install();

}


/*
  Public API
*/

window.HKRAuth = {
  login,
  signup,
  forgot,
  reset
};

})();