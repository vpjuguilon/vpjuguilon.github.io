---
title: "PRISM: Recovering Gas Concentrations from Spectra with Partial Least Squares Regression"
date: 2026-08-21
---

This was a term project for Physics 215 (Computational Methods of Physics): predicting gas
concentrations directly from simulated absorption spectra using <u>partial least squares
regression</u> (PLSR), rather than fitting individual absorption lines by hand. The motivating
question was how far a linear latent-variable model can get on a spectral unmixing problem
before line overlap and noise break it — tested across single-, double-, and triple-species
gas mixtures.

## Setup

The gas mixtures were nitrous oxide (N₂O), methane (CH₄), and carbon monoxide (CO). Absorbance
spectra were generated with the <u>HITRAN Application Programming Interface</u> (HAPI) at
randomized concentrations, simulating 4,000 gas-concentration draws as the regression targets,
with the corresponding spectra as predictors.

Simulation environment: T = 273 K, P = 1 atm, path length 0.013 cm, air as diluent (Voigt
broadening).

<figure>
  <img src="{{ '/assets/img/posts/prism/full-spectrum.png' | relative_url }}"
       alt="Simulated absorption spectrum of N2O, CH4, and CO showing their respective absorption line regions across 1.0-5.0 micrometers">
  <figcaption>Simulated absorption lines for N₂O, CH₄, and CO. N₂O and CH₄ absorb primarily
  in the near-IR (1.2–1.5 µm); CO's stronger lines sit further out, overlapping with N₂O
  around 4.5–4.8 µm — this overlap turns out to matter later.</figcaption>
</figure>

**Data processing pipeline:**

- Standardized spectra with `StandardScaler()`
- 90/10 train/test split via `train_test_split()`
- Hyperparameter tuning of `n_components` via 10-fold cross-validation
- Re-trained PLS on the full training set with the optimal `n_components`
- Evaluated on the held-out test set

Noise proportional to a percentage of the maximum absorbance amplitude (5%, 10%, 20%) was
added to the spectra to test robustness before each configuration below.

## Single-species configuration (N₂O)

<figure>
  <img src="{{ '/assets/img/posts/prism/single-species-noise.png' | relative_url }}"
       alt="N2O absorption spectrum at 5% and 20% noise levels">
  <figcaption>N₂O spectrum (8.16% mole fraction) at 5% vs. 20% noise.</figcaption>
</figure>

<figure>
  <img src="{{ '/assets/img/posts/prism/single-species-cv-tuning.png' | relative_url }}"
       alt="Cross-validated R-squared and RMSE as a function of number of PLS components">
  <figcaption>10-fold cross-validated R² and RMSE vs. number of PLS components, used to select
  <code>n_components</code> before final training.</figcaption>
</figure>

<figure>
  <img src="{{ '/assets/img/posts/prism/single-species-scatter.png' | relative_url }}"
       alt="True vs predicted N2O concentration scatter plots at 5% and 20% noise">
  <figcaption>True vs. predicted N₂O concentration on the held-out test set. R² = 0.964, RMSE =
  0.014 at 5% noise; R² = 0.842, RMSE = 0.035 at 20% noise.</figcaption>
</figure>

The single-gas case held up well even at 20% noise — a useful baseline before adding the
complications of overlapping species.

## Double-species configuration (N₂O and CH₄)

<figure>
  <img src="{{ '/assets/img/posts/prism/double-species-noise.png' | relative_url }}"
       alt="N2O and CH4 mixture absorption spectrum at 5% and 20% noise levels">
  <figcaption>N₂O (8.16%) and CH₄ (17.49%) mixture spectrum at 5% vs. 20% noise.</figcaption>
</figure>

| Noise | N₂O R² | N₂O RMSE | CH₄ R² | CH₄ RMSE | n_components |
|---|---|---|---|---|---|
| 5%  | 0.963 | 0.014 | 0.986 | 0.008 | 15 |
| 10% | 0.911 | 0.023 | 0.983 | 0.009 | 10 |
| 20% | 0.712 | 0.037 | 0.568 | 0.008 | 10 |

The model predicted CH₄ more accurately than N₂O at low-to-moderate noise, despite N₂O having
the stronger absorption lines. The likely explanation is that CH₄'s absorption is spread across
a broader spectral region, so the PLS components captured more of the variance associated with
CH₄ features specifically — concentrated lines don't automatically mean better recoverability
under this model.

## Triple-species configuration (N₂O, CH₄, and CO)

<figure>
  <img src="{{ '/assets/img/posts/prism/triple-species-noise.png' | relative_url }}"
       alt="N2O, CH4, and CO mixture absorption spectrum at 5% and 20% noise levels">
  <figcaption>N₂O, CH₄, and CO mixture spectrum at 5% vs. 20% noise.</figcaption>
</figure>

| Noise | N₂O R² | N₂O RMSE | CH₄ R² | CH₄ RMSE | CO R² | CO RMSE | n_components |
|---|---|---|---|---|---|---|---|
| 5%  | 0.965 | 0.014 | 0.986 | 0.009 | 0.854 | 0.027 | 15 |
| 10% | 0.910 | 0.022 | 0.969 | 0.012 | 0.566 | 0.048 | 10 |
| 20% | 0.829 | 0.030 | 0.949 | 0.016 | 0.200 | 0.065 | 7 |

CO degrades sharply with noise — its R² drops from 0.854 to 0.200 between 5% and 20% noise,
far faster than N₂O or CH₄. N₂O and CO share overlapping absorption features (visible in the
~4.5–4.8 µm region in the first figure), which likely creates ambiguity in signal attribution
and limits how well the model can isolate CO's contribution once noise is added. Restricting
fitting to non-overlapping wavelength regions, or pre-processing with noise smoothing, are the
two most direct ways to test whether that's really the bottleneck.

## Takeaways

- PLSR handles single- and double-species unmixing well even under significant noise, as long
  as species have reasonably distinct spectral signatures.
- Line strength alone doesn't predict recoverability — spectral breadth (how much of the
  variance a species contributes across the whole band) seems to matter more for how well PLS
  captures it.
- Overlapping absorption features are the main failure mode: CO's collapse in the triple-species
  case tracks directly with its overlap with N₂O, not with noise level alone.

## References

1. M. S. I. Sagar et al., *J. Electrochem. Soc.* 169, 127512 (2022).
2. M. Y. Bacaoco et al., *Science Diliman* 32(2) (2020).
3. H. Abdi et al., *Methods Mol. Biol.* 930, 549 (2013).
4. R. V. Kochanov et al., *J. Quant. Spectrosc. Radiat. Transf.* 177(15) (2016).
