import { ChangeDetectionStrategy, Component, inject,OnInit } from '@angular/core';

import { IndexService } from '../../data-access/index.service';

@Component({
  selector: 'app-index-page',
  standalone: true,
  imports: [],
  templateUrl: './index-page.component.html',
  styleUrl: './index-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndexPageComponent implements OnInit {
  public indexFacade = inject(IndexService);

  ngOnInit(): void {
    this.indexFacade.getInitialData();
  }
}
