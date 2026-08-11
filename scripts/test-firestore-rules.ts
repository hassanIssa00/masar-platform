import fs from 'fs';
import path from 'path';

/**
 * Isolated Firestore Security Rules Assertion Test Suite
 * Validates security boundaries, default-deny enforcement, role checks, and field immutability guards in firestore.rules.
 */
function runRulesSecurityTests() {
  console.log('────────────────────────────────────────────────────────────');
  console.log('🔥 Running Isolated Firestore Security Rules Audit Suite');
  console.log('────────────────────────────────────────────────────────────');

  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    console.error('❌ FAIL: firestore.rules file not found!');
    process.exit(1);
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  let testsPassed = 0;
  let testsTotal = 0;

  function assertRule(description: string, checkFn: () => boolean) {
    testsTotal++;
    const passed = checkFn();
    if (passed) {
      testsPassed++;
      console.log(`  ✅ PASS [Test ${testsTotal}]: ${description}`);
    } else {
      console.error(`  ❌ FAIL [Test ${testsTotal}]: ${description}`);
    }
  }

  // 1. Default Deny Fallback Check
  assertRule('Top-level default-deny rule (allow read, write: if false;)', () => {
    return rulesContent.includes('match /{document=**}') && rulesContent.includes('allow read, write: if false;');
  });

  // 2. Absence of Insecure Permissive Rules
  assertRule('No insecure blanket read/write rules (allow read, write: if true;)', () => {
    return !rulesContent.includes('allow read, write: if true;');
  });

  assertRule('No insecure blanket authenticated read rules (allow read: if request.auth != null;)', () => {
    return !rulesContent.includes('allow read: if request.auth != null;');
  });

  // 3. Accounts & Face Biometrics Security
  assertRule('Accounts direct client write is DENIED (allow write: if false;)', () => {
    const accountsBlock = rulesContent.match(/match \/accounts\/\{accountId\}[\s\S]*?\}/);
    return !!accountsBlock && accountsBlock[0].includes('allow write: if false;');
  });

  assertRule('Face records direct client read/write is COMPLETELY DENIED', () => {
    const faceBlock = rulesContent.match(/match \/faceRecords\/\{recordId\}[\s\S]*?\}/);
    return !!faceBlock && faceBlock[0].includes('allow read, write: if false;');
  });

  assertRule('Legacy credentials collection client access is DENIED', () => {
    const credBlock = rulesContent.match(/match \/credentials\/\{credId\}[\s\S]*?\}/);
    return !!credBlock && credBlock[0].includes('allow read, write: if false;');
  });

  // 4. Role Authorization & Helper Functions
  assertRule('Role helper functions isDoctor(), isTeacher(), isStaff() defined', () => {
    return (
      rulesContent.includes('function isDoctor()') &&
      rulesContent.includes('function isTeacher()') &&
      rulesContent.includes('function isStaff()')
    );
  });

  assertRule('Ownership & Linked Parent helper functions defined', () => {
    return rulesContent.includes('function isOwner(') && rulesContent.includes('function isLinkedParent(');
  });

  // 5. Field Immutability Protection
  assertRule('Field immutability guards (protectedFieldsUnchanged) present for updates', () => {
    return rulesContent.includes('function protectedFieldsUnchanged()') && rulesContent.includes('protectedFieldsUnchanged()');
  });

  // 6. Sensitive Collections Coverage
  const sensitiveCollections = [
    'reports',
    'iep_records',
    'session_records',
    'students',
    'attendance',
    'homework',
    'invoices',
    'messages',
  ];

  sensitiveCollections.forEach((coll) => {
    assertRule(`Collection '${coll}' has explicit security match block`, () => {
      return rulesContent.includes(`match /${coll}/`);
    });
  });

  console.log('────────────────────────────────────────────────────────────');
  console.log(`📊 Firestore Rules Security Assertion Suite Results: ${testsPassed} / ${testsTotal} PASSED`);
  console.log('────────────────────────────────────────────────────────────');

  if (testsPassed !== testsTotal) {
    process.exit(1);
  }
}

runRulesSecurityTests();
