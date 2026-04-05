import { Injectable } from '@angular/core';
import { GroomService } from '@core/api/groom.service';

import { IndexData } from '../models/index.model';

@Injectable({
  providedIn: 'root',
})
export class IndexApiService extends GroomService<IndexData> {
  protected endpoint = 'index-data';

  // Service de Requisições HTTP.
}
