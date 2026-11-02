# Lógica de Autoscroll Horizontal (y Vertical) de Play Colora App

Este documento contiene las instrucciones y el código necesario para implementar un desplazamiento automático suave y responsivo, vinculado al tempo de reproducción (metrónomo) y al tiempo actual de la partitura. Este código se puede reciclar para el juego "Ritmo Impostor".

## 1. Estados y Referencias Necesarias

Necesitarás crear las siguientes referencias y estados en el componente principal de tu juego (donde controlas la reproducción):

```tsx
// Referencia al contenedor que tiene el scroll (ej: el div principal de la partitura)
const scoreContainerRef = useRef<HTMLDivElement>(null);

// Estado para activar/desactivar el autoscroll a voluntad del usuario (Opcional, útil para botones en UI)
const [isAutoscrollDisabled, setIsAutoscrollDisabled] = useState(false);

// Referencias para la lógica de animación suave
const lastScrollTargetRef = useRef({ x: 0, y: 0 }); // Guarda la posición objetivo
const scrollAnimationRef = useRef<number | null>(null); // Guarda el ID de requestAnimationFrame
const userScrollTimeRef = useRef(0); // Guarda la marca de tiempo del último scroll manual
```

## 2. Manejador de Scroll Manual (Interrupción)

Para permitir que el usuario explore libremente mientras se reproduce la partitura, pausamos el autoscroll temporalmente si el usuario hace scroll con el dedo o el ratón.

```tsx
// Añadir esta función
const handleUserScroll = () => {
  userScrollTimeRef.current = Date.now();
};

// Y en el contenedor principal de JSX que tiene el scroll (scoreContainerRef), agregar:
// <div ref={scoreContainerRef} onScroll={handleUserScroll} className="overflow-auto ...">
```

## 3. Hook 1: Cálculo del Objetivo (Target)

Este hook se encarga de calcular constantemente hacia qué posición (`x`, `y`) debe moverse el scroll en el contenedor principal. Aquí debes conectar el estado actual de tu reproductor.

```tsx
// Lógica de Autoscroll - Actualiza el objetivo X e Y continuamente
useEffect(() => {
  // isPlaying: booleano que indica si la música/metrónomo está corriendo
  if (isPlaying && scoreContainerRef.current && !isAutoscrollDisabled) {
    const container = scoreContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Aquí buscas en qué compás/elemento estás según el tiempo actual de tu metrónomo.
    // (Ajustar la forma en que buscas el contenedor de notas según el DOM de tu juego Ritmo Impostor)
    const currentMeasureElement = document.getElementById(`measure-actual`); // Ejemplo
    
    if (currentMeasureElement) {
      const measureRect = currentMeasureElement.getBoundingClientRect();
      
      // Calcular el desplazamiento X dentro de tu componente.
      // (Aquí deberías usar currentPlaybackTime o el pulso actual multiplicado por tu constante de ancho de figura)
      const xOffset = /* tu cálculo del desplazamiento en píxeles dentro de la barra */ 0; 
      
      const absoluteLeft = measureRect.left - containerRect.left + container.scrollLeft + xOffset;
      
      // Centrar horizontalmente la nota que suena en medio del contenedor
      lastScrollTargetRef.current.x = Math.max(0, absoluteLeft - (containerRect.width / 2));
      
      // (Opcional) Centrar verticalmente si tus partituras saltan de línea
      const absoluteTop = measureRect.top - containerRect.top + container.scrollTop + (measureRect.height / 2);
      lastScrollTargetRef.current.y = Math.max(0, absoluteTop - (containerRect.height / 2));
    }
  }
}, [isPlaying, /* añade dependencias como currentPlaybackTime, etc */, isAutoscrollDisabled]);
```

## 4. Hook 2: Bucle de Animación Suave (Conectado al Tempo)

Este hook toma la posición meta (Target) que calculó el hook anterior y mueve el scroll progresivamente hacia ella usando `requestAnimationFrame`. **Es aquí donde el tempo del metrónomo afecta la agilidad de la cámara.**

```tsx
// Bucle de scroll suave continuo (Animation Frame Loop)
useEffect(() => {
  if (!isPlaying || isAutoscrollDisabled) {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }
    return;
  }

  const smoothScroll = () => {
    const container = scoreContainerRef.current;
    if (!container) return;

    // Si el usuario hizo scroll manual recientemente, pausa la cámara automática por 2 segundos (2000ms)
    if (Date.now() - userScrollTimeRef.current < 2000) {
      scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
      return;
    }

    const target = lastScrollTargetRef.current;
    const currentX = container.scrollLeft;
    const currentY = container.scrollTop;
    
    // Factores de interpolación basados en el BPM (tempo)
    // Tempo base de referencia es 120. Si el tempo es mayor, la cámara "sigue el ritmo" más rápido.
    // NOTA: Asegúrate de tener disponible la variable 'tempo' en este hook.
    const tempoMultiplier = tempo / 120;
    
    // Interpolación para X e Y
    const lerpFactorX = Math.min(0.5, 0.2 * tempoMultiplier);
    const lerpFactorY = Math.min(0.8, 0.4 * tempoMultiplier);
    
    const nextX = currentX + (target.x - currentX) * lerpFactorX;
    const nextY = currentY + (target.y - currentY) * lerpFactorY;
    
    // Solo aplicar si la diferencia es notoria (>0.5px) para evitar micro-temblores (jitters) de cámara
    if (Math.abs(target.x - currentX) > 0.5) {
      container.scrollLeft = nextX;
    }
    if (Math.abs(target.y - currentY) > 0.5) {
      container.scrollTop = nextY;
    }
    
    scrollAnimationRef.current = requestAnimationFrame(smoothScroll);
  };

  scrollAnimationRef.current = requestAnimationFrame(smoothScroll);

  return () => {
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }
  };
}, [isPlaying, tempo, isAutoscrollDisabled]);
```

## Resumen para el Agente Programador:
1. Esta lógica separa el cálculo del objetivo (qué nota debe verse) de la acción de movimiento (la interpolación), garantizando que siempre se desplace a la fluidez nativa del monitor (60/120 fps).
2. Debes adaptar la detección del contenedor actual en la Sección 3 según cómo estén identificados en el DOM los elementos rítmicos del juego "Ritmo Impostor".
3. Vincula el `tempo` en el multiplicador de inercia para que la cámara no se quede atrás cuando el usuario usa metrónomos muy rápidos.
4. No olvides enlazar el `onScroll={handleUserScroll}` en tu envoltorio para respetar la UX cuando el jugador haga touch en pantalla o use el ratón para desplazar.
