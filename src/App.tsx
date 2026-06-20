import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  Dumbbell,
  Library,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

type PageId = "today" | "routines" | "exercises" | "progress" | "settings";

type NavItem = {
  id: PageId;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { id: "today", label: "Hoy", icon: CalendarDays },
  { id: "routines", label: "Rutinas", icon: Dumbbell },
  { id: "exercises", label: "Ejercicios", icon: Library },
  { id: "progress", label: "Progreso", icon: BarChart3 },
  { id: "settings", label: "Ajustes", icon: Settings },
];

const contextByPage: Record<
  PageId,
  {
    title: string;
    eyebrow: string;
    body: string;
    bullets: string[];
  }
> = {
  today: {
    title: "Siguiente entrenamiento",
    eyebrow: "Contexto",
    body: "Cuando exista una rutina activa, aqui aparecera el bloque recomendado para empezar la sesion.",
    bullets: ["Rutina prioritaria", "Ultima sesion", "Recordatorio tecnico"],
  },
  routines: {
    title: "Guia de constructor",
    eyebrow: "Rutinas",
    body: "Al agregar ejercicios, este panel mostrara tecnica breve, errores comunes y descansos sugeridos.",
    bullets: ["Nombre y objetivo", "Dias activos", "Ejercicios por bloque"],
  },
  exercises: {
    title: "Guia de ejercicio",
    eyebrow: "Biblioteca",
    body: "Selecciona un movimiento para ver indicaciones compactas sin salir del flujo de eleccion.",
    bullets: ["Tecnica", "Musculos principales", "Errores comunes"],
  },
  progress: {
    title: "Lectura de progreso",
    eyebrow: "Analiticas",
    body: "Las metricas se calcularan desde sesiones guardadas y mostraran formulas simples.",
    bullets: ["Volumen", "Adherencia", "PRs y tendencia"],
  },
  settings: {
    title: "Datos locales",
    eyebrow: "Respaldo",
    body: "La exportacion e importacion seran el escape para recuperar rutinas e historial local.",
    bullets: ["Unidades", "Exportar", "Importar"],
  },
};

function App() {
  const [activePage, setActivePage] = useState<PageId>("today");
  const activeNavItem = useMemo(
    () => navItems.find((item) => item.id === activePage) ?? navItems[0],
    [activePage],
  );

  return (
    <div className="app-shell">
      <DesktopSidebar activePage={activePage} onNavigate={setActivePage} />

      <main className="workspace" aria-labelledby="page-title">
        <MobileHeader activeItem={activeNavItem} />
        <Page activePage={activePage} onNavigate={setActivePage} />
        <MobileContext activePage={activePage} />
      </main>

      <ContextPanel activePage={activePage} />
      <MobileTrainAction onClick={() => setActivePage("today")} />
      <MobileNav activePage={activePage} onNavigate={setActivePage} />
    </div>
  );
}

function DesktopSidebar({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <aside className="sidebar" aria-label="Navegacion principal">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Dumbbell size={17} strokeWidth={2.4} />
        </span>
        <span>Mi Rutina</span>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activePage === item.id}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="quiet-button" type="button">
          Ayuda
        </button>
      </div>
    </aside>
  );
}

function NavButton({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate: (page: PageId) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      className="nav-button"
      data-active={isActive}
      type="button"
      onClick={() => onNavigate(item.id)}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon size={17} strokeWidth={2} />
      <span>{item.label}</span>
    </button>
  );
}

function MobileHeader({ activeItem }: { activeItem: NavItem }) {
  const Icon = activeItem.icon;

  return (
    <header className="mobile-header">
      <div className="brand compact">
        <span className="brand-mark" aria-hidden="true">
          <Dumbbell size={16} strokeWidth={2.4} />
        </span>
        <span>Mi Rutina</span>
      </div>
      <div className="mobile-section">
        <Icon size={17} strokeWidth={2} />
        <span>{activeItem.label}</span>
      </div>
    </header>
  );
}

function Page({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  switch (activePage) {
    case "routines":
      return <RoutinesPage />;
    case "exercises":
      return <ExercisesPage />;
    case "progress":
      return <ProgressPage />;
    case "settings":
      return <SettingsPage />;
    case "today":
    default:
      return <TodayPage onNavigate={onNavigate} />;
  }
}

function TodayPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  return (
    <section className="page-section">
      <PageTitle
        kicker="Entrenamiento"
        title="Hoy"
        action={
          <button
            className="primary-button routine"
            type="button"
            onClick={() => onNavigate("routines")}
          >
            <Plus size={16} />
            Crear rutina
          </button>
        }
      />

      <div className="today-grid">
        <article className="panel next-session">
          <div>
            <p className="panel-label">Proxima sesion</p>
            <h2>No hay rutina activa</h2>
            <p className="muted">
              Crea una rutina para ver aqui el siguiente bloque y empezar a entrenar.
            </p>
          </div>
          <div className="button-row">
            <button
              className="primary-button training"
              type="button"
              aria-disabled="true"
            >
              <Play size={16} />
              Entrenar
            </button>
            <button className="secondary-button" type="button">
              Ver historial
            </button>
          </div>
        </article>

        <article className="panel compact-panel">
          <p className="panel-label">Prioridad</p>
          <EmptyRows
            rows={3}
            labels={["Rutina prioritaria", "Ultima sesion", "Proximo dia"]}
          />
        </article>
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-label">Rutinas para hoy</p>
            <h2>Sin pendientes</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Actualizar">
            <RotateCcw size={16} />
          </button>
        </div>
        <EmptyState
          title="No hay sesiones planificadas"
          body="Las rutinas creadas apareceran aqui segun su orden y proxima sesion."
        />
      </article>
    </section>
  );
}

function RoutinesPage() {
  return (
    <section className="page-section">
      <PageTitle
        kicker="Rutinas"
        title="Rutinas"
        action={
          <button className="primary-button routine" type="button">
            <Plus size={16} />
            Nueva rutina
          </button>
        }
      />

      <div className="toolbar">
        <label className="search-box">
          <Search size={15} />
          <input placeholder="Buscar rutina" aria-label="Buscar rutina" />
        </label>
        <button className="secondary-button" type="button">
          <SlidersHorizontal size={16} />
          Orden manual
        </button>
      </div>

      <article className="panel">
        <div className="table-like">
          <div className="table-head">
            <span>Rutina</span>
            <span>Objetivo</span>
            <span>Dias</span>
            <span>Ultima sesion</span>
            <span>Estado</span>
          </div>
          <EmptyState
            title="Aun no tienes rutinas"
            body="Crea la primera rutina para activar el constructor y ordenar tus bloques."
          />
        </div>
      </article>
    </section>
  );
}

function ExercisesPage() {
  return (
    <section className="page-section">
      <PageTitle kicker="Ejercicios" title="Biblioteca de ejercicios" />

      <div className="toolbar">
        <label className="search-box">
          <Search size={15} />
          <input placeholder="Buscar ejercicio" aria-label="Buscar ejercicio" />
        </label>
        <button className="secondary-button" type="button">
          Grupo muscular
        </button>
      </div>

      <div className="split-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Movimientos</p>
              <h2>Sin ejercicios cargados</h2>
            </div>
          </div>
          <EmptyRows
            rows={4}
            labels={["Nombre", "Equipo", "Musculos", "Tags"]}
          />
        </article>
        <article className="panel guide-card">
          <p className="panel-label">Guia</p>
          <h2>Elige un ejercicio</h2>
          <p className="muted">
            Aqui viviran las indicaciones de tecnica, errores comunes y recordatorios
            breves.
          </p>
          <GuideList />
        </article>
      </div>
    </section>
  );
}

function ProgressPage() {
  return (
    <section className="page-section">
      <PageTitle kicker="Progreso" title="Analiticas" />

      <div className="metric-grid">
        <MetricCard label="Sesiones" value="0" tone="training" />
        <MetricCard label="Volumen" value="0 kg" tone="progress" />
        <MetricCard label="Adherencia" value="-" tone="routine" />
      </div>

      <div className="split-grid progress-layout">
        <article className="panel chart-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Volumen semanal</p>
              <h2>Sin datos todavia</h2>
            </div>
          </div>
          <div className="chart-placeholder" aria-label="Grafica vacia">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </article>
        <article className="panel">
          <p className="panel-label">Sesiones recientes</p>
          <EmptyState
            title="No hay historial"
            body="Las sesiones guardadas alimentaran volumen, PRs y tendencia por ejercicio."
          />
        </article>
      </div>
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="page-section">
      <PageTitle kicker="Ajustes" title="Preferencias locales" />

      <article className="panel settings-list">
        <SettingsRow title="Unidades" detail="kg por defecto" />
        <SettingsRow title="Exportar datos" detail="Rutinas e historial local" />
        <SettingsRow title="Importar respaldo" detail="Recuperar datos guardados" />
        <SettingsRow title="Acciones destructivas" detail="Confirmacion obligatoria" danger />
      </article>
    </section>
  );
}

function PageTitle({
  kicker,
  title,
  action,
}: {
  kicker: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <p>{kicker}</p>
        <h1 id="page-title">{title}</h1>
      </div>
      {action}
    </header>
  );
}

function ContextPanel({ activePage }: { activePage: PageId }) {
  const context = contextByPage[activePage];

  return (
    <aside className="context-panel" aria-label="Panel contextual">
      <p className="panel-label">{context.eyebrow}</p>
      <h2>{context.title}</h2>
      <p className="muted">{context.body}</p>
      <GuideList items={context.bullets} />

      <div className="context-note">
        <span className="status-dot" />
        <p>El historial se conservara aunque una rutina cambie o se elimine.</p>
      </div>
    </aside>
  );
}

function MobileContext({ activePage }: { activePage: PageId }) {
  const context = contextByPage[activePage];

  return (
    <article className="mobile-context panel">
      <p className="panel-label">{context.eyebrow}</p>
      <h2>{context.title}</h2>
      <p className="muted">{context.body}</p>
    </article>
  );
}

function MobileNav({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <nav className="mobile-nav" aria-label="Navegacion principal">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            data-active={activePage === item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={activePage === item.id ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MobileTrainAction({ onClick }: { onClick: () => void }) {
  return (
    <button className="mobile-train-action" type="button" onClick={onClick}>
      <Play size={17} />
      Entrenar
    </button>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "routine" | "training" | "progress";
}) {
  return (
    <article className="metric-card" data-tone={tone}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function SettingsRow({
  title,
  detail,
  danger,
}: {
  title: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="settings-row" data-danger={danger}>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      {danger ? <Trash2 size={16} /> : <span className="row-status">Pendiente</span>}
    </div>
  );
}

function EmptyRows({ rows, labels }: { rows: number; labels: string[] }) {
  return (
    <div className="empty-rows" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div className="empty-row" key={labels[index] ?? index}>
          <span>{labels[index] ?? "Campo"}</span>
          <i />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function GuideList({ items }: { items?: string[] }) {
  const guideItems = items ?? ["Tecnica compacta", "Errores comunes", "Recordatorios"];

  return (
    <ul className="guide-list">
      {guideItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default App;
