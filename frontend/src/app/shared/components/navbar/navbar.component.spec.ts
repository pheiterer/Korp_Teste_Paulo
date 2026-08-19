import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { SignalRService } from '../../../core/services/signalr.service';
import { ThemeService } from '../../../core/services/theme.service';

describe('NavbarComponent', () => {
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        provideRouter([]),
        SignalRService,
        ThemeService
      ]
    }).compileComponents();

    themeService = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve inicializar com o tema claro e permitir alternar', () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    fixture.detectChanges();

    expect(themeService.currentTheme()).toBe('light');

    const toggleBtn = fixture.nativeElement.querySelector('.theme-toggle-btn');
    expect(toggleBtn).toBeTruthy();

    toggleBtn.click();
    fixture.detectChanges();

    expect(themeService.currentTheme()).toBe('dark');
  });
});
