# Design: App local de rutinas

Estado: borrador inicial  
Fecha: 2026-06-20  
Referencia visual: [mockups desktop](./mockups/desktop-flows/README.md)

## Sintesis de investigacion

Un buen `design.md` debe explicar el problema y las decisiones antes de entrar al codigo. La investigacion usada para este documento apunta a cuatro reglas practicas:

- Mantener contexto, alcance, objetivos y no objetivos al inicio.
- Enfocarse en estrategia, decisiones y tradeoffs, no en instrucciones de implementacion paso a paso.
- Registrar decisiones importantes con sus consecuencias para que el futuro mantenimiento entienda el "por que".
- Separar este documento de manuales de usuario o tutoriales. Este archivo explica el diseno del producto y del sistema.

## Contexto

El proyecto es una web local para armar rutinas, registrar entrenamientos, revisar progreso y consultar guias de ejercicio. La app debe sentirse como una herramienta de uso diario, no como una landing page.

El usuario la usara en smartphone y en navegador de PC. Los mockups actuales describen la experiencia desktop, con sidebar, area principal y paneles contextuales. La experiencia mobile debera conservar los mismos flujos, pero compactados en pantallas sucesivas.

## Objetivos

- Crear, editar, borrar y ordenar rutinas.
- Anadir, quitar y configurar ejercicios dentro de una rutina.
- Registrar una sesion activa con series, peso, repeticiones, esfuerzo y descanso.
- Guardar historial de sesiones aunque una rutina se borre.
- Mostrar analiticas basicas de adherencia, volumen, marcas y progreso por ejercicio.
- Incluir guias de ejercicio breves, visibles cuando ayudan a ejecutar o configurar un movimiento.
- Mantener una interfaz minimalista, legible y rapida de usar.

## No objetivos

- No habra cuentas de usuario, backend remoto ni sincronizacion en la primera version.
- No habra red social, comunidad, retos publicos ni feed.
- No habra planes de nutricion, calendario avanzado ni periodizacion compleja.
- No se integraran videos externos en el MVP.
- No se buscara reemplazar consejo medico o de un entrenador profesional.

## Principios de producto

- La app abre directo en la herramienta. La primera pantalla util debe ser `Hoy`, no una pagina de venta.
- En desktop se prefieren tablas, listas densas y paneles laterales sobre tarjetas grandes.
- En mobile se prioriza una accion por pantalla y navegacion inferior.
- Las guias aparecen donde reducen friccion: al elegir ejercicios y durante el entrenamiento.
- Las acciones destructivas requieren confirmacion y, cuando sea posible, deshacer.
- El progreso debe ser explicable. Las metricas deben decir de donde salen.

## Estructura de navegacion

La navegacion principal sera:

- `Hoy`: siguiente entrenamiento, rutinas prioritarias y acceso rapido a iniciar sesion.
- `Rutinas`: lista, creacion, edicion, borrado y ordenamiento.
- `Ejercicios`: biblioteca con filtros, guias y movimientos disponibles.
- `Progreso`: analiticas generales, historial y detalle por ejercicio.
- `Ajustes`: unidades, exportacion/importacion y preferencias locales.

## Flujos principales

### Crear rutina

Mockups:

- [01-crear-rutina-formulario.png](./mockups/desktop-flows/01-crear-rutina-formulario.png)
- [02-crear-rutina-constructor.png](./mockups/desktop-flows/02-crear-rutina-constructor.png)

Flujo:

1. El usuario crea una rutina y define nombre, objetivo y dias.
2. La pagina muestra una vista previa semanal y valida campos minimos.
3. El usuario entra al constructor, selecciona un dia y agrega ejercicios.
4. La pagina muestra ejercicios del dia en una tabla editable.
5. El usuario ajusta series, repeticiones, descanso y orden.
6. La pagina actualiza volumen estimado y guarda la rutina.

Decisiones:

- El constructor desktop usa tres zonas: dias, ejercicios del dia e inspector de ejercicios.
- La guia de ejercicio vive en el inspector para no interrumpir la edicion.
- La rutina puede guardarse como borrador si tiene nombre y al menos un dia.

### Borrar rutina

Mockups:

- [03-borrar-rutina-menu.png](./mockups/desktop-flows/03-borrar-rutina-menu.png)
- [04-borrar-rutina-confirmacion.png](./mockups/desktop-flows/04-borrar-rutina-confirmacion.png)

Flujo:

1. El usuario abre el menu contextual de una rutina.
2. La pagina muestra acciones normales y separa `Eliminar` como accion destructiva.
3. El usuario elige eliminar.
4. La pagina pide confirmacion y aclara que el historial se conserva.
5. El usuario confirma.
6. La pagina quita la rutina de la lista activa y muestra `Deshacer`.

Decisiones:

- Borrar una rutina no borra sesiones historicas.
- Internamente conviene usar `deletedAt` o estado equivalente para permitir deshacer y conservar referencias.
- Las sesiones guardan una copia del nombre de rutina y ejercicio para seguir siendo legibles aunque cambie la rutina original.

### Entrenar

Mockups:

- [05-entrenar-sesion-activa.png](./mockups/desktop-flows/05-entrenar-sesion-activa.png)
- [06-entrenar-resumen-final.png](./mockups/desktop-flows/06-entrenar-resumen-final.png)

Flujo:

1. El usuario inicia una rutina desde `Hoy` o `Rutinas`.
2. La pagina abre una sesion activa con cola de ejercicios, tabla de series, timer y guia.
3. El usuario registra peso, repeticiones y esfuerzo por serie.
4. La pagina marca series completadas, recalcula volumen y activa descansos.
5. El usuario finaliza la sesion.
6. La pagina muestra resumen, cambios relevantes y sugerencias para la proxima sesion.
7. El usuario guarda la sesion.
8. La pagina actualiza historial y analiticas.

Decisiones:

- La sesion activa debe tolerar pausas y ediciones antes de guardar.
- El timer de descanso ayuda, pero no bloquea avanzar.
- La guia debe ser breve: tecnica, errores comunes, musculos y recordatorios.

### Ordenar rutinas

Mockups:

- [07-ordenar-rutinas-criterios.png](./mockups/desktop-flows/07-ordenar-rutinas-criterios.png)
- [08-ordenar-rutinas-manual.png](./mockups/desktop-flows/08-ordenar-rutinas-manual.png)

Flujo:

1. El usuario abre `Rutinas`.
2. La pagina muestra lista con filtros y orden actual.
3. El usuario cambia criterio: manual, proxima sesion, recientes u objetivo.
4. La pagina reordena sin perder seleccion.
5. El usuario entra a modo manual y arrastra rutinas.
6. La pagina muestra linea de insercion, reglas y vista previa de `Hoy`.
7. El usuario guarda.
8. La pagina persiste el orden para futuras vistas.

Decisiones:

- `Hoy` debe respetar prioridad manual cuando el usuario la define.
- El modo manual es explicito para evitar arrastres accidentales.
- Las rutinas inactivas o borradas no compiten por prioridad.

### Ver analiticas

Mockups:

- [09-analiticas-dashboard.png](./mockups/desktop-flows/09-analiticas-dashboard.png)
- [10-analiticas-detalle-ejercicio.png](./mockups/desktop-flows/10-analiticas-detalle-ejercicio.png)

Flujo:

1. El usuario entra a `Progreso`.
2. La pagina muestra resumen por rango de fechas.
3. El usuario filtra por rutina o ejercicio.
4. La pagina actualiza metricas, graficas y tabla de sesiones.
5. El usuario abre detalle de ejercicio.
6. La pagina muestra evolucion, historial, PRs y sugerencia de proximo objetivo.

Decisiones:

- Las analiticas principales son volumen, sesiones, adherencia, PRs y tendencia por ejercicio.
- El detalle por ejercicio debe incluir guia tecnica para conectar progreso con ejecucion.
- Las formulas deben ser simples y visibles en UI o documentacion.

## Modelo de datos conceptual

Entidades principales:

- `Exercise`: nombre, grupo muscular, equipo, instrucciones, errores comunes, tags.
- `Routine`: nombre, objetivo, dias activos, estado, orden manual.
- `RoutineDay`: dia o bloque dentro de una rutina.
- `RoutineExercise`: ejercicio dentro de un dia, orden, series, reps objetivo, descanso.
- `WorkoutSession`: fecha, rutina origen, duracion, estado, notas.
- `SetLog`: ejercicio, serie, peso, reps, esfuerzo, completado.
- `ProgressSnapshot`: metricas derivadas para graficas o cache local.
- `Settings`: unidades, tema, preferencias de exportacion.

Relaciones:

- Una rutina contiene varios dias.
- Un dia contiene varios ejercicios configurados.
- Una sesion puede originarse en una rutina, pero debe seguir legible si la rutina cambia o se borra.
- Las analiticas se calculan desde sesiones guardadas, no desde rutinas actuales.

## Persistencia

La primera version debe ser local-first. No requiere servidor para funcionar.

Decision propuesta:

- Usar una capa pequena de almacenamiento local.
- Preferir IndexedDB para historial de sesiones y rutinas, porque los registros creceran con el tiempo.
- Mantener exportacion e importacion como escape para respaldos.

Alternativa considerada:

- `localStorage` es mas simple, pero se vuelve fragil para historial, busqueda y datos estructurados. Puede servir para prototipos, no como base si el registro de progreso es central.

## Calculos iniciales

- Volumen de serie: `peso * repeticiones`.
- Volumen de sesion: suma de volumen de series completadas.
- Adherencia: sesiones completadas contra sesiones planificadas en el rango.
- PR: mejor set o mejor estimacion registrada para un ejercicio.
- 1RM estimado: formula simple y declarada, por ejemplo Epley: `peso * (1 + reps / 30)`.

Las metricas deben mostrarse como ayuda, no como verdad absoluta.

## Estados y validaciones

- Crear rutina: nombre requerido; al menos un dia para activar; ejercicios pueden quedar vacios en borrador.
- Agregar ejercicio: evitar duplicados accidentales dentro del mismo dia, pero permitirlos si el usuario confirma.
- Borrar rutina: confirmacion obligatoria y deshacer temporal.
- Sesion activa: permitir guardar parcial, editar valores y descartar con confirmacion.
- Analiticas: mostrar estados vacios utiles cuando aun no hay sesiones.

## Accesibilidad y responsive

- Todo control debe ser usable con teclado.
- Estados de foco visibles.
- Contraste suficiente en texto, botones y graficas.
- No depender solo del color para PRs, estado activo o acciones destructivas.
- En desktop, mantener sidebar y panel contextual.
- En mobile, convertir paneles laterales en hojas, tabs o pantallas de detalle.

## Riesgos

- Datos locales pueden perderse si el navegador limpia almacenamiento. Mitigacion: exportacion/importacion visible.
- Las guias de ejercicio pueden ser demasiado genericas. Mitigacion: textos breves y conservadores, sin prometer seguridad medica.
- Las analiticas pueden sentirse mas precisas de lo que son. Mitigacion: formulas simples y etiquetas claras.
- El constructor puede crecer demasiado. Mitigacion: mantener MVP en rutinas, ejercicios, entrenamiento y progreso basico.

## Alternativas descartadas por ahora

- Backend con login: agrega complejidad antes de validar la utilidad local.
- UI basada solo en tarjetas: funciona en mobile, pero desperdicia espacio y escaneabilidad en desktop.
- Borrar historiales junto con rutinas: simplifica datos, pero destruye el valor principal de progreso.
- Guias largas por ejercicio: compiten con la accion principal y hacen mas lenta la sesion.

## Preguntas abiertas

- Cual sera el alcance inicial de la biblioteca de ejercicios?
- La primera version usara solo kg o permitira kg/lb desde ajustes?
- Se necesita exportar CSV, JSON o ambos?
- Habra plantillas de rutinas precargadas o todo sera creado por el usuario?
- El modo mobile se implementara desde el inicio o despues del primer desktop funcional?

## Referencias usadas para escribir este documento

- Design Docs at Google: https://www.industrialempathy.com/posts/design-docs-at-google/
- Architecture Decision Records: https://adr.github.io/
- Documenting Architecture Decisions: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- arc42 Template Overview: https://arc42.org/overview
- Diataxis: https://diataxis.fr/
