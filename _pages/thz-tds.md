---
layout: doc
title: THz Waveform & Spectrum Analyzer
description: Browser-based analysis tool for terahertz time-domain spectroscopy — TDS/FFT, emitter-saturation fitting, and frequency-domain convolution/deconvolution. Runs entirely client-side.
permalink: /projects/thz-tds/
live_url: https://thz-waveform-analyzer.vercel.app/
source_url: https://github.com/vpjuguilon/THz-TDS-Waveform-Analyzer
---

**NIP – THz Team** · time-domain · FFT · bandwidth · SNR

A browser-based analysis tool for terahertz time-domain spectroscopy (THz-TDS) bench work. It runs entirely client-side — no data ever leaves the browser — and covers the three routine analysis tasks of a THz-TDS workflow: inspecting time-domain waveforms and their spectra (**TDS & FFT**), fitting emitter saturation behavior against pump power or fluence (**Power Fit**), and performing frequency-domain convolution and deconvolution between measurements (**Conv / Deconv**).

This document is in two parts. **Part I** is a user guide: how to load data, what every control does, and how to export results. **Part II** explains how the tool works underneath: the signal-processing pipeline, the numerical methods, and the application architecture, including the reasoning behind several non-obvious design decisions.

---

## Part I — User guide

### 1. Getting started

The app is a single-page React application deployed on Vercel. Pushing to the `main` branch of the `THz-TDS-Waveform-Analyzer` GitHub repository triggers an automatic redeployment; the live URL updates within a minute or two of the push.

To run it locally instead, clone the repository and use the standard Vite workflow:

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # production build (vite-plugin-singlefile → one self-contained HTML file)
```

The production build is a **single self-contained HTML file**: all JavaScript, CSS, and the team logo (`src/assets/logo.png`, inlined by Vite at build time) are bundled into it. That file can be hosted anywhere or even opened directly from disk, which makes it easy to keep a copy on a lab machine with no internet access.

**Browser support.** Everything works in any modern browser. One convenience feature — the native "Save As" dialog that lets you choose a folder and filename when exporting — uses the File System Access API and is only available in Chrome and Edge. Firefox and Safari fall back to a plain download into the browser's default downloads folder with the suggested filename.

**Nothing is uploaded.** All parsing, FFTs, fitting, and rendering happen in your browser. Closing the tab discards everything, which is why the session save/load feature exists (Section 7).

### 2. Input data format

Tab 1 accepts plain-text two-column files: **column 1 is time, column 2 is amplitude**. The parser is deliberately forgiving about the details:

```
# any of these delimiters work: comma, semicolon, tab, or whitespace
0.00, -0.0012
0.05, -0.0009
0.10,  0.0154
...
```

A header row is detected automatically (any row whose cells are not all numeric is skipped), extra columns beyond the first two are ignored, and rows that fail to parse as numbers are silently dropped. Typical exports from lock-in/delay-stage acquisition software (`.csv`, `.txt`, `.dat`) load without modification.

The **time unit is not read from the file** — you tell the app whether the first column is in fs, ps, ns, or s using the *Time unit* selector. Everything downstream (the frequency axis in THz, in particular) depends on this being set correctly, so it is the first thing to check if a spectrum appears shifted by orders of magnitude. The sampling interval itself does not need to be perfectly uniform; the app uses the median interval (Section 10).

There is no hard limit on the number of points; traces of tens of thousands of samples remain responsive because charts are downsampled for display only (Section 20) — all computations use the full data.

### 3. Tab 1: TDS & FFT

This is the main workspace: load one or more waveforms, compare them in the time and frequency domains, and read off quantitative metrics.

#### 3.1 Loading and managing datasets

Use the upload button to select one or more files; each file becomes a dataset with an automatically assigned color from an 8-color palette. For every dataset you can rename it (pencil icon), change its color and line width, toggle its visibility (eye icon) without losing it, or delete it. Hidden datasets are excluded from the charts and the legend but keep their computed metrics.

#### 3.2 Processing controls

These settings apply to **all** datasets simultaneously, so every trace is processed identically and metrics are directly comparable.

| Control | Options | What it does |
|---|---|---|
| Time unit | fs / ps / ns / s | Interprets the file's time column; sets the THz frequency scale |
| Window | none / Hann / Hamming / Blackman | Apodization applied before the FFT to suppress truncation leakage |
| Zero-pad factor | ≥ 1 | Pads the windowed trace before the FFT to interpolate the spectrum on a finer frequency grid |
| Noise region | start / end | Which portion of the trace is treated as signal-free for the noise-floor estimate |
| Noise fraction | 0–1 | How much of the trace (e.g. 0.2 = 20%) that noise segment spans |
| Bandwidth mode | from peak / above noise | Whether the bandwidth threshold is defined relative to the spectral peak or the noise floor |
| Margin (dB) | number | The offset used by the bandwidth mode (e.g. peak − 10 dB, or noise + 10 dB) |
| Display | absolute / normalized | Normalized shifts each spectrum so its own peak sits at 0 dB — useful for comparing spectral *shape* across datasets with different signal levels |
| Water vapor lines | on / off | Overlays reference markers at 14 known atmospheric water-vapor absorption frequencies (0.557–1.867 THz) to help distinguish real absorption dips from artifacts |

#### 3.3 Working with the charts

Both charts (time-domain waveform, FFT magnitude in dB) share the same interaction model:

- **Zoom** mode: drag a rectangle to zoom into it (both axes).
- **Pan** mode: drag horizontally to slide the visible window.
- **Reset** restores the automatic full-range view.
- The axis min/max fields under each chart accept typed values, including negative numbers and in-progress entries like `-` or `1.5e`, committing only when the text parses to a valid number.

The time chart has a third mode, **Snapshot**: clicking on the waveform records the amplitude of *every* visible dataset at that time position, labels the point with a letter (a, b, c, … aa, ab, …), and adds a row to a snapshot table below the chart. This is the quickest way to compare traces at a specific delay — for example, reading off amplitudes at the main pulse maximum, or quantifying an etalon reflection across a sample series. Snapshots can be removed individually or cleared together, and they are saved into sessions.

#### 3.4 The metrics table

Every dataset gets one row of derived quantities, recomputed live whenever data or settings change:

| Metric | Meaning |
|---|---|
| Peak-to-peak (a.u.) | max − min of the time-domain amplitude — the standard proxy for THz field strength |
| Peak frequency (THz) | Location of the spectral maximum, refined to sub-bin precision (Section 11) |
| Bandwidth lo / hi / width (THz) | The frequency span where the spectrum stays above the threshold (Section 12) |
| Noise floor (dB) | RMS spectral level of the designated signal-free segment (Section 13) |
| SNR / DR (dB) | Peak spectral magnitude minus noise floor |

Click any column header to sort by that metric (click again to flip direction) — convenient when ranking a series of emitter or alignment configurations.

### 4. Tab 2: Power Fit

This tab characterizes emitter saturation: THz amplitude as a function of optical pump power, fitted to a saturation model to extract the saturation power P_sat (or saturation fluence F_sat).

#### 4.1 Entering data

Set the number of power steps (up to 200) and the number of datasets (up to 12). Each dataset gets a spreadsheet-style table with three columns per power step: **Power (mW)**, and the **min** and **max** of the measured THz waveform at that power. The app computes peak-to-peak amplitude (max − min) itself — you enter the raw cursor readings from the oscilloscope or lock-in trace, which avoids sign mistakes and transcription arithmetic at the bench.

The tables support **block paste from a real spreadsheet**: copy a rectangular region (multiple rows and/or columns) in Excel, Google Sheets, or Origin, click the cell where the block should start, and paste. Tab- and newline-separated values fill outward across columns and down rows automatically; pasting a single value behaves like a normal paste. Each dataset also has a *clear values* action that empties its cells without changing the table shape.

Rows are only used when all three of power, min, and max parse as finite numbers — incomplete rows are simply ignored by the plot and fit, so it is safe to leave placeholders while a measurement series is in progress.

#### 4.2 The x-axis: power or fluence

A toggle switches the x-axis between raw average power (mW) and pump fluence (mJ/cm²). Fluence mode uses three laser parameters you provide: repetition rate (MHz), spot diameter (µm), and pulse duration (fs). Only the repetition rate and spot diameter enter the fluence conversion (Section 15); pulse duration is stored for a possible future peak-intensity mode but does not affect any current number.

Because the conversion is applied to the x-values *before* fitting, the fitted saturation constant is automatically in the units of the current axis: P_sat in mW, or F_sat in mJ/cm², with no manual re-conversion.

#### 4.3 The plot and fit

Each dataset is drawn as scatter points with a distinct marker shape and color, so up to 12 series remain distinguishable in grayscale printing. Whenever a dataset has at least two valid points, the app fits

> A(P) = A_max · P / (P + P_sat)

and overlays the fitted curve, reporting A_max and P_sat (or F_sat) per dataset. The fit updates live as you type. Section 14 describes the fitting algorithm and its robustness measures.

#### 4.4 Export

The CSV export writes one row per power step with columns for power in mW, the equivalent fluence (computed with the current laser parameters regardless of the axis toggle, so both are always available), and each dataset's peak-to-peak amplitude. Chart export to PNG/SVG works as everywhere else (Section 6).

### 5. Tab 3: Conv / Deconv

This tab operates on the **complex spectra** of Tab 1 datasets: multiply two spectra (convolution of the time-domain signals) or divide them (deconvolution). The canonical use case is extracting a sample response by dividing a sample measurement by a reference measurement, or removing a known instrument response.

#### 5.1 Cards

Click *Add card* to create an operation card. Each card selects a **Dataset A** and **Dataset B** and an operation:

- **Convolve**: result = A × B (frequency-domain product)
- **Deconvolve**: result = A ÷ B, with A labeled *numerator* and B labeled *denominator / reference*

Crucially, a card's source can be **another card**, not just a Tab 1 dataset. Cards resolve in order, so you can chain operations: deconvolve a sample by a reference in card 1, then divide card 1 by a filter response in card 2, and so on. If a source becomes unavailable (a dataset was deleted, or the sources are misconfigured), the card shows an explanatory error instead of a plot.

Each card plots the result's magnitude in dB with its own independent zoom/pan controls, a rename field, a color picker, and its own export buttons.

#### 5.2 Deconvolution reliability shading

Division amplifies noise wherever the denominator is small: at frequencies where the reference spectrum has fallen into its noise, the quotient is numerically meaningless. Each deconvolution card therefore has a **shade threshold** (default 20 dB): every frequency range where the denominator's magnitude sits more than that many dB below its own peak is shaded on the plot as *unreliable*. The shading is a per-card setting, so a chained analysis can use different thresholds at each stage.

The y-axis auto-range also **ignores the unreliable regions** (and a handful of always-degenerate bins such as DC), so a diverging quotient at the band edges does not compress the trustworthy part of the spectrum into a flat line (Section 16.4).

#### 5.3 Merged comparison

Below the cards, a merged comparison chart overlays every card's result on shared axes with its own zoom/pan, and a comparison CSV export interpolates all card results onto a common frequency grid.

### 6. Exporting figures and data

Every chart has **PNG** and **SVG** export. Choosing either opens a dialog pre-filled with the chart's current on-screen size, where you can set the output resolution in pixels (200–4000 on each side) — so a figure can be re-exported at, say, 2400×1400 for a manuscript without resizing the browser window. The export is rebuilt as a standalone image with the legend baked in, and interaction artifacts such as the hover cursor line are stripped (Section 18).

CSV exports are available for the time-domain data, the FFT spectra, the power-dependence table, and the conv/deconv comparison. Multi-dataset CSVs share a common x-grid with each dataset linearly interpolated onto it (Section 18.3), which makes the files directly plottable in Origin/Excel/matplotlib without alignment work. Values are rounded to 6 significant figures.

Where the browser supports it (Chrome/Edge), all exports go through the native Save As dialog so you can pick the folder and filename; elsewhere they download with a sensible default name.

### 7. Sessions

*Save session* serializes the *entire* application state to a JSON file: every dataset's raw time/amplitude arrays and styling, all Tab 1 processing settings and axis ranges, snapshots, the complete Tab 2 tables and laser parameters, and the Tab 3 card graph. *Load session* restores everything, including the chained card structure (Section 19 documents the format).

Use sessions to hand an analysis to a labmate, to archive the state behind a figure alongside the figure itself, or simply to continue tomorrow where you stopped today. Since the file embeds the raw data, the recipient needs nothing but the app URL.

---

## Part II — How it works underneath

### 8. Application architecture

The app is a single React component (`THzAnalyzer` in `App.jsx`, ~3,000 lines) plus a set of pure helper functions above it. There is no backend, no router, and no global state library: all state lives in React hooks inside the one component, and everything derived from that state (spectra, metrics, fits, chart data) is computed in `useMemo` blocks that re-run only when their inputs change.

The stack:

| Layer | Library | Role |
|---|---|---|
| UI | React + Tailwind utility classes | Component tree, styling |
| Build | Vite + `vite-plugin-singlefile` | Dev server; single-file production bundle |
| Charts | Recharts | All plots (line, scatter, reference lines/areas) |
| Math | mathjs | The FFT itself (`math.fft`) |
| CSV | PapaParse | Robust parsing (`Papa.parse`) and generation (`Papa.unparse`) |
| Icons | lucide-react | Toolbar and control icons |

Two structural decisions matter for understanding the code:

**Pure functions outside the component.** Everything numerical — windowing, FFT wrapping, dB conversion, peak refinement, bandwidth walking, noise-floor estimation, saturation fitting, complex arithmetic, phase unwrapping, interpolation — is a plain function of its arguments, defined above the component. This keeps the numerics testable and referentially transparent; the component only orchestrates *when* they run.

**Declaration order is load-bearing.** `useMemo` initializers execute in source order during render. A memo that references a `const` declared later in the component throws a temporal-dead-zone `ReferenceError` — a class of bug this codebase has hit before. Derived values are therefore declared strictly after everything they read, and that ordering should be preserved when editing.

#### 8.1 Data flow (Tab 1)

```
file → parseFileText → { time[], amplitude[] }          (raw arrays, never mutated)
             │
             ▼
   datasets state  ──►  processed = useMemo(…)          (per-dataset, cached)
                          ├─ computeFFT(time, amp, opts)      → freqs, mags, re, im
                          ├─ toDB(mags)                        → magsDB
                          ├─ findPeakIndex / refinePeakFreq    → peakFreq, peakDB
                          ├─ computeNoiseFloorDB(…)            → noiseFloorDB
                          ├─ snrDB = peakDB − noiseFloorDB
                          ├─ computeBandwidth(…)               → { lo, hi, width }
                          └─ downsample for charts             → timeChartData, freqChartData
```

The raw `time`/`amplitude` arrays are treated as immutable after parsing. That immutability is what makes the caching layer possible: cache validity can be checked by *reference identity* (`cached.time === d.time`) instead of deep comparison (Section 20).

### 9. File parsing

`parseFileText` runs two strategies in sequence. First, PapaParse with `dynamicTyping` handles well-formed delimited files. If that yields rows with fewer than two columns — typical for whitespace-aligned instrument dumps that PapaParse reads as one wide column — a fallback splits each line on any run of whitespace, commas, or semicolons (`/[\s,;]+/`).

A header is detected as: the first row contains any cell that is not a finite number. Only that single row is skipped; some instruments emit multi-line preambles, but their lines fail numeric parsing anyway and are dropped by the row filter, which requires both `Number(r[0])` and `Number(r[1])` to be non-NaN. The net effect is that the parser extracts exactly the numeric two-column core of almost any text export without configuration.

### 10. The FFT pipeline

`computeFFT(time, amplitude, { windowType, zeroPadFactor, timeUnit })` produces the one-sided complex spectrum. The steps, in order, with the reasoning:

**1. Time step estimation.** The sampling interval is taken as the **median** of successive time differences, converted to picoseconds via the selected unit (fs → ×0.001, ns → ×1000, s → ×10¹²). The median rather than the mean makes the frequency axis immune to a common real-world defect: a single glitched timestamp or a dropped line in the file, which would bias a mean but leaves the median untouched. (The FFT itself still assumes uniform sampling — see Section 21.)

**2. Windowing.** The selected window is applied multiplicatively over the N samples:

- Hann: w(i) = 0.5 − 0.5·cos(2πi/(N−1))
- Hamming: w(i) = 0.54 − 0.46·cos(2πi/(N−1))
- Blackman: w(i) = 0.42 − 0.5·cos(2πi/(N−1)) + 0.08·cos(4πi/(N−1))

Windows trade main-lobe width (frequency resolution) against side-lobe level (leakage). For THz-TDS traces that start and end near zero, `none` is often fine; when the scan is truncated mid-ringdown, Hann/Blackman suppress the leakage skirts that would otherwise masquerade as bandwidth.

**3. Mean removal.** The mean of the *windowed* trace is subtracted. This suppresses the DC bin, which carries no physical information for an AC-coupled THz field but would otherwise dominate the spectrum's low-frequency end and distort auto-scaling. (This is also why the DC bin is treated as degenerate in Tab 3 — Section 16.4.)

**4. Zero-padding.** The trace is padded with zeros to `nextPow2(N × zeroPadFactor)`. Two independent purposes: rounding up to a power of two lets the FFT use its fast radix-2 path, and factors > 1 interpolate the spectrum onto a finer grid. Zero-padding adds **no new information** — the underlying resolution is fixed by the scan length — but the denser sampling of the same continuous spectrum makes peak positions and threshold crossings smoother, complementing the sub-bin refinements of Sections 11–12.

**5. Transform and one-sided reduction.** `math.fft` computes the complex DFT; the first half of the bins is kept (the input is real, so the spectrum is conjugate-symmetric and the second half is redundant). The frequency axis is

> f[k] = k / (paddedLen · dt_ps)   [THz]

which is the standard DFT bin spacing 1/(N·dt); with dt in ps, the result lands directly in THz. Magnitude (`hypot(re, im)`), and the raw `re`/`im` arrays for Tab 3, are returned per bin.

#### 10.1 dB conversion

`toDB` maps magnitudes to 20·log₁₀(m), with a floor at **10⁻¹⁵ of that spectrum's own peak** (i.e. −300 dB relative). The floor exists because zero-padded, mean-removed spectra contain bins that are numerically zero, and log(0) = −∞ breaks charting. An earlier version clamped at an absolute constant, which produced a visible flat shelf at −240 dB whenever genuine magnitudes approached it — and, worse, that artifact fed the y-axis auto-range. Making the floor relative to each spectrum's peak pushes it far below anything physical for this instrument class, so it never appears in a plot.

### 11. Peak detection and refinement

The peak bin is the argmax of the magnitude array. Its frequency is then refined to **sub-bin precision** by fitting a parabola through the peak bin and its two neighbors in dB (log-magnitude near a peak is closer to quadratic than linear magnitude is):

> δ = ½ (y_L − y_R) / (y_L − 2y₀ + y_R),  f_peak = f₀ + δ·Δf

with guards: the refinement is skipped at array edges, when the curvature denominator is near zero, or when |δ| > 1 (a sign the local shape isn't peak-like). The motivation is stability rather than accuracy per se: on noisy broadband spectra a raw argmax jitters between adjacent bins from trace to trace, making "peak frequency" an unreliable comparison metric; the parabolic estimate varies smoothly.

### 12. Bandwidth measurement

The threshold is set by the selected mode: **peak mode** uses (peak dB − margin), the conventional "−X dB bandwidth"; **noise mode** uses (noise floor + margin), which asks "over what range is the signal meaningfully above the noise" — often the more honest number for usable spectroscopy bandwidth.

`computeBandwidth` walks outward from the peak in both directions looking for the crossing of that threshold. Two refinements:

**Hysteresis (persistence).** A crossing only counts if the spectrum **stays below the threshold for 5 consecutive bins**. Without this, a single noisy bin dipping under the line — or a narrow genuine absorption notch such as a water-vapor line sitting above the threshold region — would truncate the reported bandwidth at a frequency well inside the actually-usable band. Running off the end of the array counts as a confirmed crossing.

**Sub-bin crossing interpolation.** The reported edge is linearly interpolated between the last bin above and first bin below the threshold, so the bandwidth doesn't quantize to the bin spacing.

If no confirmed crossing exists on a side, the edge defaults to the first/last frequency of the array.

### 13. Noise floor and SNR

The noise floor is estimated from a **signal-free segment of the time trace** — by default the final 20% (configurable in position and size, minimum 8 samples), where the THz pulse and its ringdown have decayed. The segment goes through the *same* FFT pipeline as the full trace (same window, same padding rule), and the floor is the RMS of the resulting magnitude spectrum, expressed in dB. SNR (labeled SNR / DR, since with a peak *spectral* value this is closer to a dynamic-range figure) is simply peak dB minus floor dB.

Two corrections in this computation are worth understanding, because both were once absent and together **inflated the reported SNR by roughly 9 dB**:

**Length normalization.** An unnormalized DFT's magnitude for a noise-like signal grows as √N. The peak is measured from the full N-sample trace, but the noise segment has only n samples, so its raw magnitudes are lower by √(N/n) *for the identical noise process* — not because the noise is smaller, but because fewer samples were summed. The segment magnitudes are therefore scaled by √(N/n) before averaging. For the default 20% fraction this correction alone is √5 ≈ 7 dB.

**Averaging in power, not in dB.** The floor is computed as the RMS of linear magnitudes (mean of m², then square root, then one final log). Averaging dB values directly — mean of logs — systematically underestimates the level because the logarithm is concave (Jensen's inequality); for Rayleigh-distributed noise magnitudes the bias is about 2.5 dB. Averaging in linear power is unbiased.

The practical consequence: SNR figures from this tool are conservative and comparable across scan lengths and noise-fraction settings, at the cost of looking ~9 dB worse than naïve implementations. When comparing against numbers from other software, check which convention that software uses.

### 14. Saturation curve fitting

Tab 2 fits the two-parameter saturation model

> A(P) = A_max · P / (P + P_sat)

using a hand-rolled **Levenberg–Marquardt** iteration (damped Gauss–Newton). With only two free parameters the normal equations are a 2×2 system solved in closed form, so no linear-algebra dependency is needed and the fit runs live on every keystroke.

Per iteration: analytic partial derivatives (∂A/∂A_max = P/(P+P_sat), ∂A/∂P_sat = −A_max·P/(P+P_sat)²) build the Gauss–Newton normal equations JᵀJ·δ = −Jᵀr; the diagonal is damped by (1+λ); the step is accepted only if it reduces the sum of squared errors. On acceptance λ shrinks (×0.6, floor 10⁻⁸), pushing toward fast Gauss–Newton steps near the optimum; on rejection λ grows (×3, bailing out above 10⁸), pushing toward small safe gradient-descent steps. Additional robustness measures:

- **Initialization**: A_max starts at 1.3× the largest measured amplitude; P_sat starts at the median measured power. Both are order-of-magnitude correct for any physically plausible dataset, which this simple solver needs.
- **Positivity**: a step that would make P_sat ≤ 0 instead halves it, keeping the model in its physical domain.
- **Termination**: convergence when the SSE improvement drops below 10⁻¹⁴, or after 200 iterations, or on a singular/blown-up system. Non-finite results return `null` and the UI simply shows no fit curve rather than a wrong one.
- **Input filtering**: only rows where power > 0 and both amplitude readings are finite participate; fewer than 2 such points → no fit.

Because the x-values are converted to the selected unit *before* fitting, the same code yields P_sat in mW or F_sat in mJ/cm² depending on the axis mode.

### 15. Power-to-fluence conversion

Fluence per pulse is pulse energy over spot area. With average power P in mW, repetition rate f in MHz, and a circular spot of diameter d in µm:

- pulse energy: E = P/f (mW/MHz = nJ = 10⁻⁹ J)
- spot area: A = π(d/2)² µm² = (π d²/4) · 10⁻⁸ cm²

so F = E/A = (10⁻⁹ P/f) / (π d²/4 · 10⁻⁸) J/cm² = 0.4·P/(π f d²) J/cm², i.e.

> **F [mJ/cm²] = 400 · P[mW] / (π · f[MHz] · d[µm]²)**

which is exactly the expression in `convertPowerX`. The conversion returns NaN (and the point is dropped) if the rep rate or diameter is missing or non-positive, so an incomplete laser-spec panel can never silently produce wrong fluences. Note the spot is assumed circular and the fluence is the *average* over that area (a Gaussian beam's peak fluence is 2× higher for the same 1/e² diameter definition); pulse duration deliberately does not enter — it would only matter for peak intensity, a reserved future mode.

### 16. Convolution and deconvolution

Tab 3 works entirely in the frequency domain, using the linearity of the Fourier transform: time-domain convolution is frequency-domain multiplication, and deconvolution is division.

#### 16.1 Source resolution and chaining

Each card's two sources are resolved by `resolveConvSource`, which looks the id up first among Tab 1 datasets (computing/reusing that dataset's complex FFT) and then among **already-resolved cards** in this render pass. Cards are processed in array order, so a card may reference any card above it — the card list is effectively a small dataflow DAG evaluated top to bottom. Renaming, recoloring, or re-shading a card doesn't disturb the chain because sources are tracked by stable ids; the session format converts those ids to indices for persistence (Section 19).

#### 16.2 The common grid

Two spectra generally have different frequency axes (different scan lengths, padding). Before combining, both are linearly interpolated onto a shared **2,000-point linear grid from 0 to the lower of the two Nyquist-limited maxima**. Real and imaginary parts are interpolated *separately* — interpolating magnitude and phase instead would corrupt the complex value wherever the phase wraps between grid points. Frequencies outside a source's range contribute 0.

#### 16.3 Complex arithmetic and phase

Per grid point, the standard complex product or quotient is applied; division guards against a vanishing denominator (|B|² < 10⁻³⁰ → 0). The result's phase (atan2) is **unwrapped** by adding/subtracting 2π wherever consecutive bins jump by more than π, recovering the continuous phase curve — the quantity whose slope gives group delay and whose curvature gives dispersion in a transfer-function measurement.

#### 16.4 Reliability handling

Two classes of untrustworthy bins are identified:

**Degenerate bins** (both operations): frequencies where *either* operand's magnitude is below 10⁻⁶ of that operand's own peak. The DC bin is always in this class because of the mean removal in Section 10; whatever the arithmetic produces there is a floor-clamp artifact.

**Weak-denominator regions** (deconvolution only): bins where the denominator sits more than the shade threshold (default 20 dB) below its own peak. `findTrueSpans` merges these flags into contiguous frequency intervals, which are drawn as shaded regions on the card's chart.

Both classes are excluded from the y-axis auto-range. This uses explicit flags rather than a percentile trim because a *large fraction* of the grid can be affected (the entire band beyond the reference's rolloff, say) — a percentile-based robust range assumes outliers are rare, and would still let a wide diverging region crush the plot.

### 17. Charting internals

All plots are Recharts components, but several behaviors are implemented around Recharts rather than by it:

**Rectangle zoom.** Recharts reports the x-value under the cursor (`activeLabel`) but only the *pixel* y-coordinate. To zoom on both axes, the app measures the plot area's pixel extent from the rendered SVG (`getYPixelRange`) and builds a linear pixel→value mapping (`makeYScale`) against the currently effective y-domain at drag start. The drag rectangle is drawn as an overlay, and on release both axis domains are set from the selection (ignoring degenerate zero-area drags).

**Pan.** Horizontal drags convert pixel displacement into a data-domain shift using the domain span at drag start divided by the plot's pixel width, so panning speed always matches the cursor regardless of zoom level.

**Axis hygiene.** Any externally settable domain passes through `validDomain`, which rejects non-finite or inverted ranges — this is the guard that prevents the historical "type NaN, chart disappears" failure. Tick positions come from `niceTicks`/`niceStep`, which choose 1–2–5×10ⁿ step sizes so typed or dragged ranges still get human-readable labels. The `NumberRangeField` component keeps a local text draft and only commits parseable numbers upward, which is what makes typing `-`, `.5`, or `1e-2` possible in controlled inputs; it re-syncs from the parent when the domain changes externally (drag-zoom, Reset) without clobbering an edit in progress.

**dB-axis auto-range.** FFT y-ranges ignore the bottom 3% of values (`computeDbYDomain`) so residual numerical-floor bins never stretch the axis, with 10% padding around the trimmed range.

### 18. Export internals

#### 18.1 SVG reconstruction

Recharts' rendered SVG is not directly usable as a figure: it depends on page CSS, contains interaction elements, and has no legend. `buildExportSvg` clones the chart's SVG, strips interaction artifacts (the hover cursor line is disabled at the source via `cursor={false}` on tooltips *and* removed from the clone), sanitizes attributes, inlines the necessary styling, appends a legend built from the visible datasets, and sizes the result to the resolution chosen in the export dialog (clamped to 200–4000 px per side).

#### 18.2 PNG rasterization

For PNG, the reconstructed SVG is serialized, loaded into an `Image`, drawn onto a canvas at the requested pixel dimensions, and encoded — so the requested resolution is genuine raster resolution, not an upscale of the on-screen size.

#### 18.3 CSV on a common grid

Different datasets have different x-samples, so multi-series CSVs are built by generating a linear x-grid over the shared range, linearly interpolating each series onto it (`interpolateSeries`, which leaves cells blank outside a series' own support rather than extrapolating), and rounding to 6 significant figures (`roundSig`) to keep files diff-able and compact. The power-dependence CSV is an exception — it exports the entered table faithfully, one row per power step, plus a computed fluence column.

#### 18.4 Saving

`saveFile` tries the File System Access API (`showSaveFilePicker`) for a real Save As dialog; a user cancel is detected via `AbortError` and treated as intentional (no fallback download, no error). Any other failure, or an unsupporting browser, falls back to the classic invisible-anchor download (`downloadBlob`) with the suggested filename.

### 19. Session file format

Sessions are JSON, currently `version: 2`:

```jsonc
{
  "version": 2,
  "name": "my_session",
  "datasets": [           // raw data + styling; ids are regenerated on load
    { "name": "...", "color": "#0d9488", "visible": true, "width": 1.4,
      "time": [/* raw numbers */], "amplitude": [/* raw numbers */] }
  ],
  "settings": {           // all Tab 1 processing + axis state
    "windowType": "hann", "zeroPadFactor": 2, "timeUnit": "ps",
    "noiseRegion": "end", "noiseFraction": 0.2,
    "bandwidthMode": "peak", "marginDB": 10,
    "displayMode": "absolute", "showWaterVapor": false,
    "timeDomain": null, "timeYDomain": null, "freqDomain": null, "freqYDomain": null
  },
  "snapshots": [ { "id": "...", "time": 5.2, "entries": [ { "id": "...", "name": "...", "color": "...", "value": 0.013 } ] } ],
  "powerDependence": {
    "numPowers": 5, "numPowerDatasets": 1,
    "datasets": [ { "name": "...", "color": "...", "marker": "circle", "rows": [ { "power": "", "min": "", "max": "" } ] } ],
    "powerXUnit": "mW", "laserRepRate": 80, "laserPulseDuration": 100, "laserSpotDiameter": 2
  },
  "convolution": [        // card graph with sources as index references
    { "name": "...", "operation": "deconvolve", "shadeThresholdDB": 20, "color": "...",
      "sourceA": { "kind": "dataset", "index": 0 },
      "sourceB": { "kind": "card", "index": 0 } }
  ]
}
```

The one subtlety is the conv-card sources. Live cards reference sources by runtime id, but ids are regenerated on every load, so the saved form stores `{ kind: "dataset" | "card", index }` — position in the saved datasets array or the saved card array respectively. On load, datasets are restored first, then cards in order, mapping indices back to the freshly generated ids. This round-trips arbitrary chains. Loading validates the overall shape and falls back to a clear error message ("not a valid session file") rather than partially restoring.

### 20. Performance engineering

The app stays responsive with many datasets and long traces through four mechanisms:

**Reference-keyed FFT caches.** Two `useRef` maps (`fftCacheRef` for Tab 1 results, `convRawFftCacheRef` for complex spectra) cache per-dataset computation keyed by dataset id, validated by reference equality of the raw arrays plus a JSON string of the relevant settings. Because raw arrays are never mutated, reference equality is a sound and O(1) validity check. The effect: renaming a dataset, toggling visibility, changing a color, or typing in an unrelated field re-renders without recomputing a single FFT. This is what eliminated the historical keystroke input lag.

**View state kept out of compute state.** Zoom/pan domains, mode toggles, and drag selections live in separate state objects from the data that feeds the memoized pipelines (explicitly so for Tab 3, where `convXDomains`/`convYDomains`/`convModes`/`convSels` are parallel maps keyed by card id, apart from `convCards` itself). Panning a chart therefore never invalidates the FFT/convolution memo.

**Display downsampling.** Charts render at most ~1,500 points per series via stride sampling (Tab 3 results are computed on a 2,000-point grid and strided the same way for display), while metrics, fits, and exports always use the full-resolution data. Recharts' SVG rendering is the bottleneck, not the math, so this is where the responsiveness budget goes.

**Cheap solvers.** The 2×2 closed-form LM step (Section 14) and the linear-time single-pass helpers (peak scan, bandwidth walk, RMS) keep per-keystroke costs trivially small next to the FFT, which the caches prevent from re-running anyway.

### 21. Known limitations

Honest edges of the current implementation, so results are interpreted correctly:

- **Uniform sampling is assumed by the FFT.** The median-dt estimate tolerates isolated timestamp glitches, but a genuinely non-uniform scan (e.g. adaptive step sizes) is not resampled — the spectrum would be distorted. Resample externally first.
- **Noise-floor segment shares the trace.** If the pulse ringdown or an etalon echo extends into the chosen noise fraction, the floor is overestimated (SNR underestimated). Check the time-domain plot when setting region/fraction.
- **Window amplitude correction is not applied.** Windowed spectra are attenuated by the window's coherent gain (e.g. ×0.5 for Hann ≈ −6 dB). Peak *comparisons* under identical settings are unaffected — which is the tool's use case — but absolute dB values change with the window choice, and SNR is computed with the same window on both segments so it is largely insensitive.
- **Deconvolution has no regularization.** Outside the shaded regions the raw quotient is shown; there is no Wiener/Tikhonov filtering. The shading tells you where not to look, it does not repair those bins.
- **Fluence assumes a circular flat-top spot.** Gaussian-beam peak fluence is 2× the reported average for the same diameter definition.
- **Sessions embed raw data.** Very long traces × many datasets produce large JSON files; this is deliberate (self-contained portability) but worth knowing.
- **Save As dialog is Chromium-only**; other browsers use default downloads.

---

*This documentation describes `App.jsx` as of August 2026 (3-tab build: TDS & FFT, Power Fit, Conv / Deconv; session format v2).*
