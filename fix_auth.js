const { execSync } = require('child_process');
const crypto = require('crypto');

const password = 'password123';
const secret = 'tamuu-jwt-secret-2024';
const hash = crypto.createHash('sha256').update(password + secret).digest('hex');

console.log('Target Hash:', hash);

const sql = `UPDATE users SET password_hash = '${hash}' WHERE email IN ('admin@tamuu.id', 'user@tamuu.id')`;
console.log('SQL:', sql);

try {
    const output = execSync(`npx wrangler d1 execute tamuu --command="${sql}" --remote --yes`, { cwd: 'c:\\Users\\62896\\Documents\\tamuuid\\server\\workers' });
    console.log('Success:', output.toString());
} catch (error) {
    console.error('Error:', error.stdout?.toString() || error.message);
}
