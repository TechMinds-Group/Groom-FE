import 'zone.js';

import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => {
  document.body.innerHTML += '<div style="color: red; padding: 20px;"><h2>Bootstrap Error:</h2><pre>' + err.stack + '</pre></div>';
  console.error(err);
});
