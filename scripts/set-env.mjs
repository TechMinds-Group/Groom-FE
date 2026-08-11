import { writeFileSync, mkdirSync } from 'fs';

const apiUrl = process.env['NG_APP_API_URL'] || 'https://groom.techminds.net.br';
const googleClientId = process.env['NG_APP_GOOGLE_CLIENT_ID'] || '';

const content = `// Este arquivo Ǹ gerado automaticamente pelo script scripts/set-env.mjs durante o build
export const environment = {
  apiUrl: '${apiUrl}',
  googleClientId: '${googleClientId}',
};
`;

mkdirSync('src/environments', { recursive: true });
writeFileSync('src/environments/environment.prod.ts', content, { encoding: 'utf8' });

console.log(`✅ environment.prod.ts gerado com apiUrl: ${apiUrl}`);
