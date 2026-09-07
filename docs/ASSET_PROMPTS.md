# Guía de generación de imágenes (ChatGPT / DALL·E / Sora Image)

Los retratos que trae el repo (`public/assets/portraits/*.svg`) son **emblemas
provisionales generados por código**. Esta guía sirve para sustituirlos por
ilustraciones reales manteniendo la coherencia visual de la app.

---

## 1. Biblia de estilo

La referencia es la interfaz de **Persona 5**: cómic sucio, tinta gruesa, rojo
sangre sobre negro, composición diagonal y agresiva.

| Eje | Decisión |
| --- | --- |
| Técnica | Ilustración vectorial / cel-shading duro. Nada de render 3D ni fotorrealismo. |
| Línea | Contorno negro grueso e irregular, tipo pincel entintado. |
| Sombras | Dos tonos como máximo por zona. Sombra plana, sin degradados suaves. |
| Paleta | Negro carbón `#08070A`, hueso `#F6F1E6`, rojo sangre `#E01133` y **un** color de acento por clase (tabla del punto 4). |
| Fondo | Abstracto: tramas de puntos (halftone), franjas diagonales, salpicaduras de tinta. Nunca un paisaje detallado. |
| Encuadre | Plano medio corto (de la cintura o el pecho hacia arriba), personaje ligeramente girado, mirada a cámara. |
| Actitud | Pose de portada: cadera girada, hombro adelantado, gesto rotundo. |
| Textura | Grano de papel impreso y ligero desalineado de tinta (registro fuera de sitio). |

**Reglas duras**

- Composición en **diagonal**: el eje del cuerpo cae entre 8° y 15° respecto a la vertical.
- El personaje ocupa el **70–80 %** del alto del lienzo.
- El **tercio inferior** debe quedar razonablemente vacío o en sombra: la app dibuja
  encima el nombre y la clase.
- Alto contraste. Si al reducir la imagen a 130 px de ancho la silueta no se lee,
  la imagen no vale.

---

## 2. Especificaciones técnicas

| Uso | Proporción | Tamaño mínimo | Nombre de archivo |
| --- | --- | --- | --- |
| Retrato de personaje | 5:7 vertical | 1000 × 1400 px | `public/assets/portraits/<slug>.png` |
| Fondo de pantalla de título (opcional) | 16:9 | 2560 × 1440 px | `public/assets/bg-title.png` |

- Formato **PNG** (o WebP). Sin marcas de agua, sin marcos, sin texto dentro de la imagen.
- Deja **8 % de margen de seguridad** por cada lado: la carta se muestra rotada
  −3° y recorta esquinas.
- Comprime antes de subir (objetivo: < 300 KB por retrato).

---

## 3. Prompt base (rellena los `[corchetes]`)

```
Ilustración de personaje de fantasía en estilo cómic tipo Persona 5 / cartel serigrafiado.

SUJETO: [especie] [género] [clase de D&D], [rasgo físico distintivo],
[vestimenta y armadura], empuñando [arma u objeto característico].
Expresión [actitud: desafiante / serena / burlona / feroz].

COMPOSICIÓN: plano medio corto, cuerpo girado unos 12° respecto a la vertical,
hombro adelantado hacia cámara, mirada al espectador. El personaje ocupa el 75 %
del alto. Tercio inferior en sombra plana, sin detalle.

ESTILO: cel-shading duro de dos tonos, contorno de tinta negra gruesa e irregular,
tramas de puntos de cómic (halftone), franjas diagonales al fondo, salpicaduras de
tinta, textura de papel impreso con el color ligeramente desalineado.

PALETA: negro carbón, blanco hueso, rojo sangre y [color de acento de la clase]
como único color saturado. Máximo cuatro colores en total.

FORMATO: lienzo vertical 5:7, fondo abstracto (nunca un paisaje), sin texto,
sin marco, sin firma.
```

### Prompt negativo (si la herramienta lo admite)

```
fotorrealismo, render 3D, sombreado suave, degradados, colores pastel, anime moe,
texto, letras, logotipos, marca de agua, marco, firma, manos deformes,
fondo de paisaje detallado, encuadre de cuerpo entero, imagen apaisada
```

---

## 4. Colores de acento por clase

Usa exactamente estos códigos: son los mismos que colorean el menú cuando se
selecciona el personaje (`src/data/rules.ts`).

| Clase | Acento | Archivo |
| --- | --- | --- |
| Bárbaro | `#E03A2F` | `barbaro.png` |
| Bardo | `#D8478F` | `bardo.png` |
| Brujo | `#8B46D6` | `brujo.png` |
| Clérigo | `#E8C15A` | `clerigo.png` |
| Druida | `#4FAE62` | `druida.png` |
| Explorador | `#3F8F6D` | `explorador.png` |
| Guerrero | `#B9411F` | `guerrero.png` |
| Hechicero | `#E2593F` | `hechicero.png` |
| Mago | `#3F7BD6` | `mago.png` |
| Monje | `#37B6C4` | `monje.png` |
| Paladín | `#DCAE3C` | `paladin.png` |
| Pícaro | `#6F7CD1` | `picaro.png` |

---

## 5. Ejemplos listos para pegar

**Mago**

```
Ilustración de personaje de fantasía en estilo cómic tipo Persona 5 / cartel serigrafiado.
SUJETO: mago elfo de mediana edad, pelo blanco recogido, cicatriz de quemadura en la
sien, túnica larga de cuello alto con runas cosidas, sostiene un tomo abierto que
levita y chispea. Expresión serena y arrogante.
COMPOSICIÓN: plano medio corto, cuerpo girado 12°, hombro adelantado, mirada al
espectador, ocupa el 75 % del alto, tercio inferior en sombra plana.
ESTILO: cel-shading duro de dos tonos, contorno de tinta negra gruesa, halftone,
franjas diagonales al fondo, textura de papel impreso desalineado.
PALETA: negro carbón, blanco hueso, rojo sangre y azul #3F7BD6 como único color saturado.
FORMATO: vertical 5:7, fondo abstracto, sin texto, sin marco, sin firma.
```

**Bárbara**

```
... SUJETO: bárbara goliat de piel gris veteada, cabeza rapada con tatuajes tribales,
pieles y hombreras de hueso, gran hacha a dos manos apoyada al hombro. Expresión feroz.
... PALETA: negro carbón, blanco hueso, rojo sangre y rojo #E03A2F como único color saturado.
```

**Pícara**

```
... SUJETO: pícara tiefling de cuernos curvos y cola visible, capucha calada, media
sonrisa, dos dagas curvas cruzadas al pecho, monedas cayendo de la mano. Expresión burlona.
... PALETA: negro carbón, blanco hueso, rojo sangre y violeta #6F7CD1 como único color saturado.
```

---

## 6. Cómo meter las imágenes en la app

1. Guarda el PNG en `public/assets/portraits/` con el nombre de la tabla del punto 4.
2. Si sustituyes un retrato existente (mismo nombre, extensión `.svg` → `.png`),
   actualiza la extensión en dos sitios:
   - `PORTRAIT_SLUGS` / `portraitForClass()` en `src/data/defaults.ts`
   - `PORTRAIT_LIBRARY` en `src/sections/IdentitySection.tsx`
3. Para un retrato de un personaje concreto (no de clase), no hace falta tocar código:
   en la ficha, sección **Identidad → Retrato → Subir**. La imagen se guarda como
   data-url junto al personaje.

> Cuando esté Supabase conectado, ese botón subirá el archivo a un bucket de Storage
> y guardará solo la URL pública. Ver `docs/SUPABASE.md`.

---

## 7. Lista de comprobación antes de dar una imagen por buena

- [ ] Se lee la silueta a 130 px de ancho.
- [ ] El tercio inferior no tiene detalle importante (lo tapa el nombre).
- [ ] Solo hay un color saturado además del rojo/negro/hueso.
- [ ] No hay texto ni marco dentro de la imagen.
- [ ] Proporción 5:7 exacta y peso por debajo de 300 KB.
