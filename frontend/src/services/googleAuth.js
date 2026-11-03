// Respondent Google sign-in through Firebase Authentication.
// The Firebase SDK is loaded on demand, so visitors of surveys without sign-in never download it.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

export const isGoogleSignInConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

let authPromise;

function loadAuth() {
  authPromise ??= Promise.all([import('firebase/app'), import('firebase/auth')]).then(([app, auth]) => {
    const instance = auth.getAuth(app.initializeApp(config));
    return { auth, instance };
  });
  return authPromise;
}

const toUser = (user) => (user ? { uid: user.uid, email: user.email, name: user.displayName || '' } : null);

export const googleAuth = {
  // Calls back with the signed-in user (or null) now and whenever it changes. Returns an unsubscribe function.
  onChange(callback) {
    let unsubscribe = () => {};
    let cancelled = false;
    loadAuth().then(({ auth, instance }) => {
      if (!cancelled) unsubscribe = auth.onAuthStateChanged(instance, (user) => callback(toUser(user)));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  },

  async signIn() {
    const { auth, instance } = await loadAuth();
    const provider = new auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await auth.signInWithPopup(instance, provider);
    return toUser(result.user);
  },

  async signOut() {
    const { auth, instance } = await loadAuth();
    await auth.signOut(instance);
  },

  // Fresh ID token (Firebase refreshes it automatically when it is about to expire).
  async getIdToken() {
    const { instance } = await loadAuth();
    return instance.currentUser ? instance.currentUser.getIdToken() : '';
  },
};
