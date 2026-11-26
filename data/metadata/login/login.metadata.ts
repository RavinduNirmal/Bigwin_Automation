import { TestMetadataCollection } from '../../../utils/metadata-manager';

/**
 * Allure + Excel metadata for tests/e2e/login/login.spec.ts (keyed by TC id).
 * Written for readers who do not know the system: plain steps with the exact screen labels, concrete test data,
 * exact expected messages (same standard as the Global Checksum cases).
 */
const base = {
  epic: 'Authentication',
  owner: 'QA Team',
} as const;

const LOGGED_OUT = '- The BigWin admin portal (dev) is reachable: https://e763fesnjnk.dev.accelr.net\n- You are NOT logged in (use a private / incognito browser window)';
const ADMIN = '- An active admin account (email + password) - the test account in config/env/dev.json';
const SAME_PAGE = 'Nothing is changed in the system (no data is created)';

export const LoginMetadata: TestMetadataCollection = {
  'TC-LOGIN-001': {
    ...base, feature: 'Login', story: 'Login Page UI', severity: 'critical', tags: ['Smoke', 'Regression', 'UI'],
    tms: 'TC-LOGIN-001',
    description: 'The login page shows everything a user needs to log in\nWhy: if any control is missing or disabled, nobody can log in to the admin portal.',
    preconditions: LOGGED_OUT,
    testData: '- Login page address: <portal>/auth/jwt/login',
    steps: [
      'Open the login page in the browser',
      'Look at the browser tab title',
      'Check the "Email address" box, the "Password" box and the "Login" button',
      'Check the "Forgot password" link and the information message under the form',
    ],
    expectedResult: '- The browser tab title is "Login | BigWin"\n- "Email address", "Password" and "Login" are shown and can be used (not greyed out)\n'
      + '- The "Forgot password" link is shown\n- An information message starting with "You can use ..." is shown',
    postconditions: SAME_PAGE,
  },
  'TC-LOGIN-002': {
    ...base, feature: 'Login', story: 'Successful Login', severity: 'blocker', tags: ['Smoke', 'Regression'],
    tms: 'TC-LOGIN-002',
    description: 'An admin with the correct email, password and one-time code (OTP) is logged in\nWhy: this is the only way into the admin portal - every other workflow starts here.',
    preconditions: `${LOGGED_OUT}\n${ADMIN}`,
    testData: '- Email and password of the admin account\n- OTP: the 6-digit code sent to the admin (on dev the test code from config/env/dev.json)',
    steps: [
      'Open the login page',
      'Type the admin email in "Email address" and the password in "Password"',
      'Click "Login"',
      'In the "Verify OTP" window, type the 6-digit OTP',
      'Click the submit button of the "Verify OTP" window',
      'Accept the message the browser shows',
    ],
    expectedResult: '- After "Login" the "Verify OTP" window opens\n- After the OTP the browser shows the message "Successfully validated OTP"\n'
      + '- The dashboard (Home) opens with the menu on the left - the admin is logged in',
    postconditions: 'The admin is logged in (the session is saved in the browser)',
  },
  'TC-LOGIN-003': {
    ...base, feature: 'Login', story: 'Invalid Credentials', severity: 'critical', tags: ['Regression', 'Negative'],
    tms: 'TC-LOGIN-003',
    description: 'A wrong password is rejected\nWhy: only someone who knows the password may get in.',
    preconditions: `${LOGGED_OUT}\n${ADMIN}`,
    testData: '- The admin email\n- A wrong password: "Wrong" + a number, e.g. "Wrong1732432100000"',
    steps: [
      'Open the login page',
      'Type the admin email and the WRONG password',
      'Click "Login"',
    ],
    expectedResult: '- A red message "Invalid email or password." is shown\n- The "Verify OTP" window does NOT open\n- You stay on the login page (not logged in)',
    postconditions: SAME_PAGE,
  },
  'TC-LOGIN-004': {
    ...base, feature: 'Login', story: 'Invalid Credentials', severity: 'normal', tags: ['Regression', 'Negative'],
    tms: 'TC-LOGIN-004',
    description: 'An email address that has no account is rejected\nWhy: unknown people must not get into the portal.',
    preconditions: LOGGED_OUT,
    testData: '- An email address that is not registered: "nobody.<unique number>@example.com"\n- Password: "AnyPassword1"',
    steps: [
      'Open the login page',
      'Type the unregistered email and the password "AnyPassword1"',
      'Click "Login"',
    ],
    expectedResult: '- An error message is shown that names the unknown email\n- The "Verify OTP" window does NOT open\n- You stay on the login page',
    postconditions: SAME_PAGE,
  },
  'TC-LOGIN-005': {
    ...base, feature: 'Login', story: 'Field Validation', severity: 'normal', tags: ['Regression', 'Validation'],
    tms: 'TC-LOGIN-005',
    description: 'Clicking "Login" with empty boxes tells the user what is missing\nWhy: the user must see clearly that both email and password are needed.',
    preconditions: LOGGED_OUT,
    testData: '- Email: (empty)\n- Password: (empty)',
    steps: [
      'Open the login page',
      'Leave "Email address" and "Password" empty',
      'Click "Login"',
    ],
    expectedResult: '- "Email is required" is shown under the email box\n- "Password is required" is shown under the password box\n- You stay on the login page',
    postconditions: SAME_PAGE,
  },
  'TC-LOGIN-006': {
    ...base, feature: 'Login', story: 'Field Validation', severity: 'normal', tags: ['Regression', 'Validation'],
    tms: 'TC-LOGIN-006',
    description: 'An email address in the wrong format is refused before anything is sent\nWhy: the user should be told about a typing mistake straight away.',
    preconditions: LOGGED_OUT,
    testData: '- Email: "not-an-email" (no @ sign)\n- Password: "AnyPassword1"',
    steps: [
      'Open the login page',
      'Type "not-an-email" in "Email address" and "AnyPassword1" in "Password"',
      'Click "Login"',
    ],
    expectedResult: '- "Must be a valid email" is shown under the email box\n- The "Verify OTP" window does NOT open\n- You stay on the login page',
    postconditions: SAME_PAGE,
  },
  'TC-LOGIN-007': {
    ...base, feature: 'Login', story: 'Security', severity: 'normal', tags: ['Regression', 'Security'],
    tms: 'TC-LOGIN-007',
    description: 'The password is hidden while it is typed\nWhy: people near the screen must not be able to read the password.',
    preconditions: LOGGED_OUT,
    testData: '- Password: "Secret123"',
    steps: [
      'Open the login page',
      'Type "Secret123" in "Password"',
      'Look at the password box',
    ],
    expectedResult: '- The password box shows dots (or stars), not the letters "Secret123"',
    postconditions: SAME_PAGE,
  },
  'TC-LOGIN-008': {
    ...base, feature: 'OTP Verification', story: 'OTP Validation', severity: 'normal', tags: ['Regression', 'Validation'],
    tms: 'TC-LOGIN-008',
    description: 'The one-time code (OTP) must be exactly 6 digits\nWhy: an empty or wrong-format code must never log anyone in.',
    preconditions: `${LOGGED_OUT}\n${ADMIN}`,
    testData: '- OTP 1: (empty)\n- OTP 2: "12a" (too short, contains a letter)',
    steps: [
      'Log in with the admin email and the correct password - the "Verify OTP" window opens',
      'Leave the OTP empty and click the submit button',
      'Type "12a" as the OTP and click the submit button again',
    ],
    expectedResult: '- Empty OTP: "OTP is required" is shown\n- "12a": "OTP must be 6 digits" is shown\n- In both cases you are NOT logged in (you stay on the login page)',
    postconditions: 'Not logged in; nothing is changed in the system',
  },
  'TC-LOGIN-009': {
    ...base, feature: 'OTP Verification', story: 'Cancel OTP', severity: 'minor', tags: ['Regression'],
    tms: 'TC-LOGIN-009',
    description: 'Closing the OTP window without a code keeps the user logged out\nWhy: email + password alone must never be enough to get in.',
    preconditions: `${LOGGED_OUT}\n${ADMIN}`,
    testData: '- The admin email and the correct password',
    steps: [
      'Log in with the admin email and the correct password - the "Verify OTP" window opens',
      'Click "Cancel" in the "Verify OTP" window',
    ],
    expectedResult: '- The "Verify OTP" window closes\n- You stay on the login page and are NOT logged in (no session is saved)',
    postconditions: 'Not logged in; nothing is changed in the system',
  },
  'TC-LOGIN-010': {
    ...base, feature: 'Forgot Password', story: 'Forgot Password Dialog', severity: 'minor', tags: ['Regression', 'UI'],
    tms: 'TC-LOGIN-010',
    description: 'The "Forgot password" window opens and can be closed\nWhy: a user who forgot the password must be able to start the reset.',
    preconditions: LOGGED_OUT,
    testData: '- None (no code is requested - "Send Code to Mobile" is NOT clicked)',
    steps: [
      'Open the login page',
      'Click "Forgot password"',
      'Look at the window that opens',
      'Click "Cancel" (do NOT click "Send Code to Mobile")',
    ],
    expectedResult: '- The "Forgot Password" window shows an "Email" box and a "Send Code to Mobile" button\n- "Cancel" closes the window and you are back on the login page',
    postconditions: 'No reset code is sent; nothing is changed in the system',
  },
  'TC-LOGIN-011': {
    ...base, feature: 'Access Control', story: 'Protected Pages', severity: 'critical', tags: ['Regression', 'Security'],
    tms: 'TC-LOGIN-011',
    description: 'Someone who is not logged in cannot open an admin page by typing its address\nWhy: admin data must only be visible after logging in.',
    preconditions: LOGGED_OUT,
    testData: '- Address of the Lottery Type page: <portal>/dashboard/lottery/lottery-type',
    steps: [
      'Without logging in, type the Lottery Type page address in the browser and open it',
    ],
    expectedResult: '- The login page is shown instead (the address changes to .../auth/jwt/login)\n- The Lottery Type page and its data are NOT shown',
    postconditions: SAME_PAGE,
  },
  'TC-LOGIN-012': {
    ...base, feature: 'Access Control', story: 'Session Reuse', severity: 'normal', tags: ['Regression'],
    tms: 'TC-LOGIN-012',
    description: 'An admin who is already logged in is not asked to log in again\nWhy: users should not have to log in again while their session is still valid.',
    preconditions: '- You are already logged in as admin in this browser (the session is valid - it lasts about 8 hours)',
    testData: '- Login page address: <portal>/auth/jwt/login',
    steps: [
      'While logged in, open the login page address',
    ],
    expectedResult: '- The login form is NOT shown\n- You are taken to the dashboard',
    postconditions: SAME_PAGE,
  },
};
