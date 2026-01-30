# Authentication Context Refactoring Guide

> **For Junior Frontend Developers**: A step-by-step guide to understanding React Context best practices, authentication state management, and how different files work together.

---

## Table of Contents
1. [The Problem We Solved](#the-problem-we-solved)
2. [Understanding the File Structure](#understanding-the-file-structure)
3. [How the Pieces Work Together](#how-the-pieces-work-together)
4. [The Login Flow: Step by Step](#the-login-flow-step-by-step)
5. [Why This Approach is Better](#why-this-approach-is-better)
6. [Common Pitfalls and How We Fixed Them](#common-pitfalls-and-how-we-fixed-them)
7. [Quick Reference](#quick-reference)

---

## The Problem We Solved

### Before Refactoring: The Monolithic `AppContext`

**What it looked like:**
```typescript
// ❌ OLD: Everything mixed together
const AppContext = {
  user: User | null,
  setUser: (user) => void,           // ⚠️ Dangerous! Anyone can break auth
  isCheckSign: boolean,
  setIsCheckSign: (bool) => void,
  isShowSignModal: boolean,
  setIsShowSignModal: (bool) => void,
  configs: Record<string, string>,
  fetchConfigs: () => Promise<void>,
  fetchUserInfo: () => Promise<void>,
  fetchUserCredits: () => Promise<void>,
  showOneTap: (configs) => Promise<void>,
}
```

**Problems:**
1. **Mixed Responsibilities**: Authentication logic + UI state in one place
2. **Exposed Setters**: Any component could call `setUser(null)` and break login
3. **Scattered Logic**: Login code repeated in 15+ components
4. **Hard to Test**: Can't test auth separately from UI
5. **Confusing**: New developers don't know what's auth vs UI state

---

## Understanding the File Structure

Think of your app as a **city with different districts**. Each district has a specific purpose.

### The New Structure

```
src/
├── shared/
│   ├── contexts/
│   │   ├── auth.tsx          ← 🔐 Authentication District (User login/logout)
│   │   └── ui.tsx            ← 🎨 UI District (Modals, configs)
│   │
│   └── blocks/
│       └── sign/
│           ├── sign-in-form.tsx    ← 📝 The Login Form (uses both contexts)
│           ├── sign-user.tsx       ← 👤 The User Avatar in Header
│           └── sign-modal.tsx      ← 🪟 The Login Popup
│
└── app/
    └── [locale]/
        └── layout.tsx         ← 🏛️ City Hall (wraps everything with providers)
```

### Mental Model: Districts and Citizens

```
┌─────────────────────────────────────────────────┐
│  City Hall (layout.tsx)                         │
│  ┌───────────────────────────────────────────┐  │
│  │  AuthProvider (Authentication District)   │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  UIProvider (UI District)           │  │  │
│  │  │  ┌───────────────────────────────┐  │  │  │
│  │  │  │  Your App Components          │  │  │  │
│  │  │  │  (Citizens living in the city)│  │  │  │
│  │  │  └───────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Why this order matters:**
- `AuthProvider` wraps `UIProvider` because UI might need to know if user is logged in
- But auth logic doesn't need to know about modals or UI state

---

## How the Pieces Work Together

### 1. The Authentication Context (`auth.tsx`)

**Think of it as a Bank Vault** 🏦

```typescript
// src/shared/contexts/auth.tsx

export interface AuthContextType {
  // 👀 READ-ONLY: You can see the money, but can't touch it directly
  user: User | null,
  isCheckSign: boolean,
  
  // 🔑 ACTIONS: You need permission (these methods) to access the vault
  login: (email, password, callbackURL?) => Promise<void>,
  logout: (redirectTo?) => Promise<void>,
  refreshUser: () => Promise<void>,
  showOneTap: (configs) => Promise<void>,
}
```

**Key Concept: Encapsulation**
- ❌ No `setUser` exposed → Components can't accidentally break auth
- ✅ Only `login()`, `logout()`, `refreshUser()` → Clear, controlled actions

**What happens inside:**
```typescript
export function AuthProvider({ children }) {
  // 🔒 Private state (only this file can modify)
  const [user, setUser] = useState<User | null>(null);
  
  // 🔌 Connected to Better Auth (the real authentication system)
  const { data: session, isPending } = useSession();
  
  // 🔄 Auto-sync: When Better Auth updates, we update our local state
  useEffect(() => {
    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser);  // ← Only we can do this!
      fetchUserInfo();
    }
  }, [sessionUser?.id]);
  
  // 🎬 Actions that components can call
  const login = async (email, password, callbackURL) => {
    await signIn.email({ email, password, callbackURL });
    await refreshUser();  // ← Make sure UI updates immediately
  };
  
  return (
    <AuthContext.Provider value={{ user, isCheckSign, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### 2. The UI Context (`ui.tsx`)

**Think of it as a Light Switch Panel** 💡

```typescript
// src/shared/contexts/ui.tsx

export interface UIContextType {
  // 🎚️ Simple toggles - OK to expose setters
  isShowSignModal: boolean,
  setIsShowSignModal: (show: boolean) => void,
  isShowPaymentModal: boolean,
  setIsShowPaymentModal: (show: boolean) => void,
  
  // ⚙️ App configuration
  configs: Record<string, string>,
  fetchConfigs: () => Promise<void>,
}
```

**Why setters are OK here:**
- Toggling a modal on/off is simple and safe
- No complex business logic
- Can't break the app if misused

---

### 3. The Root Layout (`app/[locale]/layout.tsx`)

**Think of it as City Hall** 🏛️ - Where all districts are established

```typescript
// src/app/[locale]/layout.tsx

export default function LocaleLayout({ children }) {
  return (
    <NextIntlClientProvider>
      <ThemeProvider>
        {/* 🔐 Authentication District established first */}
        <AuthProvider>
          {/* 🎨 UI District inside auth district */}
          <UIProvider>
            {children}  {/* ← Your app lives here */}
            <Toaster />
          </UIProvider>
        </AuthProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
```

**Why this nesting order?**
```
AuthProvider wraps UIProvider
    ↓
Because UI might need to check: "Is user logged in?"
    ↓
But Auth doesn't care about: "Is modal open?"
```

---

## The Login Flow: Step by Step

Let's trace what happens when you click the "Sign In" button.

### Visual Flow Diagram

```
┌─────────────┐
│   User      │
│ clicks      │
│ "Sign In"   │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│ 1. SignInForm Component                         │
│    (sign-in-form.tsx)                           │
│                                                  │
│    handleSignIn() {                             │
│      await signIn.email({ email, password })    │
│    }                                             │
└──────┬──────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│ 2. Better Auth Library                          │
│    (External library - not our code)            │
│                                                  │
│    - Sends request to server                    │
│    - Server validates credentials               │
│    - Server sets session cookie 🍪              │
└──────┬──────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│ 3. SignInForm onSuccess Callback                │
│                                                  │
│    onSuccess: async () => {                     │
│      setIsShowSignModal(false);  // Close popup │
│      router.refresh();           // Refresh page│
│      await refreshUser();        // ← KEY FIX! │
│    }                                             │
└──────┬──────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│ 4. AuthContext.refreshUser()                    │
│    (auth.tsx)                                   │
│                                                  │
│    refreshUser() {                              │
│      // Reset throttle flag                     │
│      didFallbackSyncRef.current = false;        │
│                                                  │
│      // Get fresh session (bypass throttle)     │
│      const session = await authClient           │
│                           .getSession();         │
│      setUser(session.user);  // Update state!   │
│                                                  │
│      // Get extended info                       │
│      await fetchUserInfo();                     │
│      await fetchUserCredits();                  │
│    }                                             │
└──────┬──────────────────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────────────────┐
│ 5. React Re-renders All Components              │
│    that use useAuth()                           │
│                                                  │
│    SignUser component (header avatar):          │
│      const { user } = useAuth();                │
│      // user is now populated!                  │
│      return <Avatar src={user.image} />         │
└──────┬──────────────────────────────────────────┘
       │
       ↓
┌─────────────┐
│   User      │
│ sees their  │
│ profile pic │
│ immediately!│
└─────────────┘
```

### Code Walkthrough

#### Step 1: User Fills Form and Clicks Login

```typescript
// src/shared/blocks/sign/sign-in-form.tsx

export function SignInForm({ callbackUrl }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // 🔑 Get auth actions from AuthContext
  const { refreshUser } = useAuth();
  
  // 🎨 Get UI controls from UIContext
  const { setIsShowSignModal } = useUI();
  
  const handleSignIn = async () => {
    // Validate inputs...
    
    // 📡 Call Better Auth to login
    await signIn.email(
      { email, password, callbackURL: callbackUrl },
      {
        onSuccess: async () => {
          // ✅ Login succeeded! Now update the UI:
          
          // 1️⃣ Close the login modal
          setIsShowSignModal(false);
          
          // 2️⃣ Refresh server components
          router.refresh();
          
          // 3️⃣ ⭐ THE KEY FIX: Immediately update user state
          await refreshUser();
        },
        onError: (e) => {
          toast.error(e.message);
        }
      }
    );
  };
  
  return (
    <form onSubmit={handleSignIn}>
      <Input value={email} onChange={e => setEmail(e.target.value)} />
      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <Button type="submit">Sign In</Button>
    </form>
  );
}
```

#### Step 2: AuthContext Updates State

```typescript
// src/shared/contexts/auth.tsx

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  
  const refreshUser = useCallback(async () => {
    // 🚫 Reset the throttle flag
    // (This allows immediate session check, bypassing the 1-second throttle)
    didFallbackSyncRef.current = false;
    
    // 📞 Call Better Auth directly to get fresh session
    try {
      const res = await authClient.getSession();
      const freshUser = extractSessionUser(res?.data ?? res);
      
      if (freshUser?.id) {
        // 💾 Update the user state
        setUser(freshUser);  // ← This triggers re-render!
      }
    } catch (e) {
      console.log('get session failed:', e);
    }
    
    // 📊 Fetch additional user data
    await fetchUserInfo();     // Get user profile details
    await fetchUserCredits();  // Get remaining credits
  }, []);
  
  return (
    <AuthContext.Provider value={{ user, refreshUser, ... }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### Step 3: Header Component Shows Avatar

```typescript
// src/shared/blocks/sign/sign-user.tsx

export function SignUser() {
  // 👤 Get user from AuthContext
  const { user, isCheckSign } = useAuth();
  
  // 🎨 Get UI controls
  const { setIsShowSignModal } = useUI();
  
  // 🔄 React automatically re-renders when user changes!
  
  if (isCheckSign) {
    return <Loader2 className="animate-spin" />;
  }
  
  if (user) {
    // ✅ User is logged in - show avatar
    return (
      <DropdownMenu>
        <Avatar>
          <AvatarImage src={user.image} alt={user.name} />
        </Avatar>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={logout}>
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  
  // ❌ User not logged in - show sign in button
  return (
    <Button onClick={() => setIsShowSignModal(true)}>
      Sign In
    </Button>
  );
}
```

---

## Why This Approach is Better

### Comparison Table

| Aspect | ❌ Old Way (AppContext) | ✅ New Way (AuthContext + UIContext) |
|--------|------------------------|-----------------------------------|
| **Encapsulation** | `setUser` exposed to all components | Only `login()`, `logout()` exposed |
| **Safety** | Any component can break auth | Auth logic protected |
| **Clarity** | Mixed auth + UI concerns | Clear separation |
| **Testing** | Hard to test auth in isolation | Easy to mock `useAuth()` |
| **Maintenance** | Logic scattered in 15 files | Centralized in `auth.tsx` |
| **Onboarding** | Confusing for new developers | Clear mental model |

### Real-World Analogy

**Old Way (AppContext):**
```
Your bank gives you:
- The vault key 🔑
- The ability to directly modify your balance 💰
- The light switch for the lobby 💡
- The coffee machine settings ☕

Problem: You might accidentally change your balance to $0!
```

**New Way (AuthContext + UIContext):**
```
Your bank gives you:
- A teller window (login/logout methods) 🏦
- You can check your balance (read user)
- But only the bank can modify it (encapsulated)

Separately:
- You control the lobby lights (UI state) 💡
- You control the coffee machine (configs) ☕
```

---

## Common Pitfalls and How We Fixed Them

### Pitfall #1: Login Status Not Updating Immediately

**The Bug:**
```
User clicks "Sign In" → Success → Modal closes → Header still shows "Sign In" button
User presses Command+R → Header now shows profile picture
```

**Why it happened:**
1. Better Auth's `useSession()` hook is throttled (1 second minimum between requests)
2. After login, the session cookie is set, but `useSession()` hasn't re-fetched yet
3. Components relying on `useSession()` show stale data

**The Fix:**
```typescript
// In sign-in-form.tsx
onSuccess: async () => {
  setIsShowSignModal(false);
  router.refresh();           // Refresh server components
  await refreshUser();        // ⭐ Manually trigger user state update
}

// In auth.tsx
const refreshUser = async () => {
  didFallbackSyncRef.current = false;  // Reset throttle flag
  
  // Directly call getSession (bypass throttle)
  const session = await authClient.getSession();
  setUser(session.user);  // Update state immediately!
  
  await fetchUserInfo();
  await fetchUserCredits();
};
```

**Key Insight:**
- Don't rely solely on automatic hooks after mutations
- Manually trigger state updates when you know data changed
- Bypass throttling when you have fresh data

---

### Pitfall #2: Duplicate Variable Declaration

**The Bug:**
```typescript
// ❌ This causes error:
const { user, configs } = useUI();
const { user } = useAuth();
// Error: Identifier 'user' has already been declared
```

**Why it happened:**
During refactoring, we forgot to remove `user` from `UIContext` when moving it to `AuthContext`.

**The Fix:**
```typescript
// ✅ Correct:
const { configs, setIsShowSignModal } = useUI();  // No user here
const { user } = useAuth();                        // User only from auth
```

**Key Insight:**
- Each context should have a single, clear responsibility
- `user` belongs in `AuthContext`, not `UIContext`
- Use TypeScript to catch these errors early

---

### Pitfall #3: Forgetting to Reset Throttle Flags

**The Bug:**
```typescript
// ❌ Old code:
const didFallbackSyncRef = useRef(false);

useEffect(() => {
  if (didFallbackSyncRef.current) return;  // Only runs once!
  
  didFallbackSyncRef.current = true;
  fetchSession();
}, []);
```

**Why it happened:**
The flag prevents the fallback from running multiple times, but after login, we need it to run again!

**The Fix:**
```typescript
// ✅ New code:
const refreshUser = async () => {
  // Reset the flag so fallback can run again
  didFallbackSyncRef.current = false;
  
  // Fetch fresh session
  const session = await authClient.getSession();
  setUser(session.user);
};
```

**Key Insight:**
- Flags that prevent re-execution need to be reset at the right time
- After login is a good time to reset auth-related flags
- Document why flags exist and when they should reset

---

## Quick Reference

### When to Use Each Hook

```typescript
// 🔐 Need user data or auth actions?
const { user, isCheckSign, login, logout, refreshUser } = useAuth();

// 🎨 Need to control modals or get configs?
const { isShowSignModal, setIsShowSignModal, configs } = useUI();

// 🌐 Need routing?
const router = useRouter();

// 🌍 Need translations?
const t = useTranslations('namespace');
```

### Common Patterns

#### Pattern 1: Check if User is Logged In
```typescript
function ProtectedComponent() {
  const { user, isCheckSign } = useAuth();
  const { setIsShowSignModal } = useUI();
  
  if (isCheckSign) {
    return <Loader2 className="animate-spin" />;
  }
  
  if (!user) {
    return (
      <Button onClick={() => setIsShowSignModal(true)}>
        Sign In to Continue
      </Button>
    );
  }
  
  return <div>Welcome, {user.name}!</div>;
}
```

#### Pattern 2: Perform Action After Login
```typescript
function FeatureComponent() {
  const { user } = useAuth();
  const { setIsShowSignModal } = useUI();
  
  const handleAction = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }
    
    // Proceed with action
    await doSomething();
  };
  
  return <Button onClick={handleAction}>Do Something</Button>;
}
```

#### Pattern 3: Refresh User Data After Mutation
```typescript
function UpdateProfileComponent() {
  const { refreshUser } = useAuth();
  
  const handleUpdate = async (data) => {
    await updateProfile(data);
    
    // Refresh user state to show updated data
    await refreshUser();
    
    toast.success('Profile updated!');
  };
  
  return <Form onSubmit={handleUpdate} />;
}
```

---

## Summary: The Big Picture

### What We Built

```
┌─────────────────────────────────────────────────────────┐
│  Application                                            │
│                                                          │
│  ┌────────────────────┐    ┌──────────────────────┐   │
│  │  AuthContext       │    │  UIContext           │   │
│  │  (Bank Vault)      │    │  (Light Switches)    │   │
│  │                    │    │                      │   │
│  │  • user            │    │  • isShowSignModal   │   │
│  │  • isCheckSign     │    │  • isShowPaymentModal│   │
│  │  • login()         │    │  • configs           │   │
│  │  • logout()        │    │  • fetchConfigs()    │   │
│  │  • refreshUser()   │    │                      │   │
│  └────────────────────┘    └──────────────────────┘   │
│           ↓                           ↓                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Components use useAuth() and useUI()           │  │
│  │                                                   │  │
│  │  • SignInForm   • SignUser   • Generators       │  │
│  │  • Dashboard    • Pricing    • Chat             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Takeaways

1. **Separation of Concerns**: Auth logic separate from UI logic
2. **Encapsulation**: Hide dangerous operations behind safe methods
3. **Single Source of Truth**: One place for auth state, one place for UI state
4. **Explicit Updates**: Manually refresh state after mutations
5. **Clear Mental Model**: Easy for new developers to understand

### Next Steps for Learning

1. ✅ Read this document
2. ✅ Trace the login flow in the actual code
3. ✅ Try adding a new feature using `useAuth()` and `useUI()`
4. ✅ Read the Better Auth documentation
5. ✅ Experiment with adding a new context (e.g., `ThemeContext`)

---

## Additional Resources

- [React Context Documentation](https://react.dev/learn/passing-data-deeply-with-context)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Separation of Concerns Principle](https://en.wikipedia.org/wiki/Separation_of_concerns)
- [Encapsulation in Software Design](https://en.wikipedia.org/wiki/Encapsulation_(computer_programming))

---

**Questions?** Ask your team lead or senior developer. Understanding these patterns takes time, but they'll make you a better developer! 🚀
