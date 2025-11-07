/* script.js - GoTravel Pink Edition
   - Login validation (hardcoded demo + localStorage hashed fallback)
   - Inline error messages for invalid username/password
   - Guest button handler
   - Forgot-password reset (client-side, localStorage)
   - Small UI helpers
*/

/* --------------------
   Helper: SHA-256 hash
   -------------------- */
async function hashString(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* --------------------
   User storage helpers (localStorage)
   -------------------- */
async function saveUser(username, password) {
  const hashed = await hashString(password);
  const users = JSON.parse(localStorage.getItem('gt_users') || '{}');
  users[username] = hashed;
  localStorage.setItem('gt_users', JSON.stringify(users));
}

async function verifyUserLocal(username, password) {
  const users = JSON.parse(localStorage.getItem('gt_users') || '{}');
  if (!users[username]) return false;
  const hashed = await hashString(password);
  return users[username] === hashed;
}

/* Create a default user 'admin' with password '12345' if not present */
(async () => {
  const users = JSON.parse(localStorage.getItem('gt_users') || '{}');
  if (!users['admin']) {
    await saveUser('admin', '12345');
    // console.log('Default admin created in localStorage (hashed).');
  }
})();

/* --------------------
   UI helpers (inline error)
   -------------------- */
function showInlineError($input, message) {
  $input.addClass('is-invalid');
  let $grp = $input.closest('.mb-3');
  $grp.find('.invalid-feedback.custom').remove();
  $grp.append(`<div class="invalid-feedback custom">${message}</div>`);
  $input.focus();
  // small visual nudge
  $input.animate({ left: "-=6px" }, 50).animate({ left: "+=6px" }, 50).animate({ left: "0px" }, 50);
}

function clearInlineError($input) {
  $input.removeClass('is-invalid');
  $input.closest('.mb-3').find('.invalid-feedback.custom').remove();
}

/* --------------------
   Forgot Password Module
   -------------------- */
(function(){
  let bsForgotModal = null;
  document.addEventListener('DOMContentLoaded', function() {
    const el = document.getElementById('forgotModal');
    if (el) bsForgotModal = new bootstrap.Modal(el);
  });

  // open modal
  $(document).on('click', '#forgotLink', function(e) {
    e.preventDefault();
    $('#fp-step1').show();
    $('#fp-step2').hide();
    $('#fp-username').val('').removeClass('is-invalid');
    $('#fp-newpass').val('').removeClass('is-invalid');
    $('#fp-confpass').val('').removeClass('is-invalid');
    $('#forgotModal .invalid-feedback.custom').remove();
    if (bsForgotModal) bsForgotModal.show();
  });

  // Step 1: check username exists
  $(document).on('click', '#fp-check', async function() {
    const uname = $('#fp-username').val() ? $('#fp-username').val().trim() : '';
    $('#fp-username').removeClass('is-invalid');
    $('#fp-username').closest('.mb-3').find('.invalid-feedback.custom').remove();

    if (!uname) {
      $('#fp-username').addClass('is-invalid');
      $('#fp-username').closest('.mb-3').append('<div class="invalid-feedback custom">Please enter username.</div>');
      $('#fp-username').focus();
      return;
    }

    const users = JSON.parse(localStorage.getItem('gt_users') || '{}');
    if (!users[uname]) {
      $('#fp-username').addClass('is-invalid');
      $('#fp-username').closest('.mb-3').append('<div class="invalid-feedback custom">Username not found.</div>');
      return;
    }

    // username exists -> show step 2
    $('#fp-step1').hide();
    $('#fp-step2').show();
    $('#fp-newpass').focus();
  });

  // Step 2: reset password
  $(document).on('click', '#fp-reset', async function() {
    $('#fp-newpass, #fp-confpass').removeClass('is-invalid');
    $('#fp-newpass').closest('.mb-3').find('.invalid-feedback.custom').remove();
    $('#fp-confpass').closest('.mb-3').find('.invalid-feedback.custom').remove();

    const uname = $('#fp-username').val() ? $('#fp-username').val().trim() : '';
    const npass = $('#fp-newpass').val() ? $('#fp-newpass').val().trim() : '';
    const cpass = $('#fp-confpass').val() ? $('#fp-confpass').val().trim() : '';

    if (!npass) {
      $('#fp-newpass').addClass('is-invalid');
      $('#fp-newpass').closest('.mb-3').append('<div class="invalid-feedback custom">Please enter new password.</div>');
      return;
    }
    if (npass.length < 4) {
      $('#fp-newpass').addClass('is-invalid');
      $('#fp-newpass').closest('.mb-3').append('<div class="invalid-feedback custom">Password must be at least 4 characters.</div>');
      return;
    }
    if (!cpass || cpass !== npass) {
      $('#fp-confpass').addClass('is-invalid');
      $('#fp-confpass').closest('.mb-3').append('<div class="invalid-feedback custom">Passwords do not match.</div>');
      return;
    }

    try {
      await saveUser(uname, npass);
      alert('Password reset successful. Please login with your new password.');
      if (bsForgotModal) bsForgotModal.hide();
      if ($('#username').length) $('#username').val(uname);
      if ($('#password').length) $('#password').val('');
    } catch (err) {
      console.error('Error resetting password', err);
      alert('An unexpected error occurred while resetting password.');
    }
  });

  // cancel handler - clear
  $(document).on('click', '#fp-cancel', function() {
    $('#fp-step1').show();
    $('#fp-step2').hide();
    $('#fp-username, #fp-newpass, #fp-confpass').val('').removeClass('is-invalid');
    $('#forgotModal .invalid-feedback.custom').remove();
  });
})();

/* --------------------
   Main DOM ready handlers
   -------------------- */
$(document).ready(function() {

  /* LOGIN */
  $('#loginForm').on('submit', async function(e) {
    e.preventDefault();
    clearInlineError($('#username'));
    clearInlineError($('#password'));

    const user = $('#username').val() ? $('#username').val().trim() : '';
    const pass = $('#password').val() ? $('#password').val().trim() : '';

    if (!user) {
      showInlineError($('#username'), 'Please enter username.');
      return;
    }
    if (!pass) {
      showInlineError($('#password'), 'Please enter password.');
      return;
    }

    // quick demo hardcoded credential
    if (user === 'admin' && pass === '12345') {
      if ($.mobile && $.mobile.changePage) {
        $.mobile.changePage('home.html', { transition: 'slide' });
      } else {
        window.location.href = 'home.html';
      }
      return;
    }

    // fallback: check localStorage hashed users
    try {
      const ok = await verifyUserLocal(user, pass);
      if (ok) {
        if ($.mobile && $.mobile.changePage) {
          $.mobile.changePage('home.html', { transition: 'slide' });
        } else {
          window.location.href = 'home.html';
        }
        return;
      }
    } catch (err) {
      console.error('verifyUserLocal error', err);
    }

    // invalid credentials
    showInlineError($('#username'), 'Invalid username or password.');
    showInlineError($('#password'), 'Invalid username or password.');
    alert('Login failed: invalid username or password. (Demo default: admin / 12345)');
  });

  /* Guest button behaviour */
  $('#guestBtn').on('click', function(e) {
    e.preventDefault();
    if ($.mobile && $.mobile.changePage) {
      $.mobile.changePage('home.html', { transition: 'slide' });
    } else {
      window.location.href = 'home.html';
    }
  });

  /* Clear inline errors on input */
  $('#username, #password').on('input', function() {
    clearInlineError($(this));
  });

}); // end ready
