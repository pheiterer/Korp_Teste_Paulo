import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotaFiscalCadastroComponent } from './components/nota-fiscal-cadastro/nota-fiscal-cadastro.component';
import { NotaFiscalListComponent } from './components/nota-fiscal-list/nota-fiscal-list.component';
import { NotaFiscalService } from '../../core/services/nota-fiscal.service';

@Component({
  selector: 'app-notas-fiscais',
  standalone: true,
  imports: [CommonModule, NotaFiscalCadastroComponent, NotaFiscalListComponent],
  templateUrl: './notas-fiscais.component.html',
  styleUrls: ['./notas-fiscais.component.scss']
})
export class NotasFiscaisComponent {
  @ViewChild('notaList') notaList!: NotaFiscalListComponent;
  private notaFiscalService = inject(NotaFiscalService);

  onNotaCadastrada(): void {
    if (this.notaList) {
      this.notaList.carregarNotas();
    } else {
      this.notaFiscalService.getNotasFiscais().subscribe();
    }
  }
}
