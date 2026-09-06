---
layout: doc
title: "Partial least squares regression and interpretation of spectral measurements (PRISM)"
description: >-
  A PLSR model predicting gas concentrations from simulated absorption spectra of
  N₂O, CH₄, and CO mixtures, generated with the HITRAN API (HAPI), across single-,
  double-, and triple-species configurations and multiple noise levels.
permalink: /projects/prism/
---
# Partial Least Squares Regression and Interpretation of Spectral Measurements (PRISM)

Vince Paul P. Juguilon

National Institute of Physics, University of the Philippines Diliman, Philippines

\*Corresponding author: [vpjuguilon@up.edu.ph](mailto:vpjuguilon@up.edu.ph)

Physics 215: Computational Methods in Physics (2nd Semester AY 2024–2025)

## Abstract

Partial least squares regression (PLSR) was employed to predict gas concentrations from simulated absorption spectra of mixtures containing nitrous oxide (N₂O), methane (CH₄), and carbon monoxide (CO), in single-, double-, and triple-species configurations. The absorbance spectra used for the training and test sets were generated using the HITRAN Application Programming Interface (HAPI) at arbitrary and randomized concentrations. Results showed that the model was able to predict gas concentrations with coefficients of determination R² > 0.9 and relative RMSE < 10%, even under noise-levels of around 10% of the max amplitude. These metrics highlight the capability of the model to resolve overlapping spectral spectral features. Moreover, PLSR demonstrated tolerance for noisy measurements, which is an advantage compared to models that rely on discrete wavelength analysis.

**Keywords:** air quality monitoring, urban gas, absorbance spectroscopy, partial least squares regression

## 1 Introduction

Accurate measurement of atmospheric gas concentrations is essential for applications such as urban air quality monitoring, industrial emission control, and environmental research. Real-time and precise detection of urban gases like methane (CH₄), carbon monoxide (CO), and nitrous oxide (N₂O) is also critical for assessing pollution sources [1, 2].

Traditionally, gas concentrations are measured using chemometric or electrochemical methods [3]. These approaches are well-established but may require periodic calibration. Additionally, these sensors can be sensitive to environmental conditions and are sometimes limited in terms of selectivity and speed. Spectroscopic techniques offer a non-invasive, selective, and rapid alternative based on the unique absorption features of gases in the ultraviolet (UV) to infrared (IR) spectrum [4]. However, interpreting the absorption spectra of gases requires robust statistical modeling, especially in mixtures with overlapping spectral features [5].

Partial least squares regression (PLSR) is a widely used multivariate technique that addresses this challenge by projecting both spectral data and concentration values into a shared latent space [6]. It identifies components that maximize the covariance between predictor variables (e.g., absorbance spectra) and response variables (e.g., gas concentrations). Unlike simpler regression techniques, PLSR is effective even when predictors are highly collinear or when the number of variables exceeds the number of observations [7]. This makes it especially suitable for analyzing complex or noisy spectral data, as is often the case in real-world gas sensing applications.

In this study, a partial least squares regression (PLSR) model was employed to predict gas concentrations from three types of mixtures: a single-species N₂O mixture diluted with air, a two-species mixture of N₂O and CH₄, and a three-species mixture comprising N₂O, CH₄, and CO. The selected gases exhibit strong absorption features in the mid-infrared region (2000–3200 cm⁻¹ or approximately 3.1–5.0 µm) which makes them ideal candidates for spectroscopic analysis and model evaluation.

## 2 Methodology

### 2.1 Generating randomized concentration labels

A Python script (`molecular_concentrations`) was used to generate randomized gas concentrations. The concentrations were arbitrarily set to range from 1% to 30% by mol fraction for each gas in the mixture. This range is significantly higher than typical atmospheric concentrations, which are usually in the ppm to ppb range. This elevated range was chosen to ensure strong absorbance signals and to evaluate the method as a proof of concept.

The script generates blocks of concentration labels with either randomized or fixed concentrations for each gas, as shown in Figure 1. This will be used later during model training of double- and triple-species mixtures in order for the model to isolate and learn spectral features specific to each gas.

The `molecular_concentrations` script was run separately for each of the three gases, with each run producing a `labels.csv` file containing a single column of concentrations. For the double- and triple-species configuration, the corresponding `labels.csv` files were generated by concatenating the concentration columns from the CSV files of individual gases.

<div class="subfigs subfigs--figs">
  <figure class="subfig">
    <img src="{{ '/assets/img/projects/prism/fig1-concentration-labels.png' | relative_url }}"
         alt="Diagram of concentration label blocks for N2O, CH4, and CO with randomized and fixed values">
    <figcaption><strong>Figure 1:</strong> The script generates 4,000 concentration values each for N₂O, CH₄, and CO. Some blocks use randomized (colored) or fixed (grayed) values for the mixed gas configurations in order for the model to isolate and learn spectral features specific to each gas.</figcaption>
  </figure>

  <figure class="subfig">
    <img src="{{ '/assets/img/projects/prism/fig2-labels-to-spectra.png' | relative_url }}"
         alt="Diagram showing labels.csv transformed into spectra.csv with wavelength columns">
    <figcaption><strong>Figure 2:</strong> A <code>spectra.csv</code> file is generated, with columns representing wavelengths and rows containing the absorption spectrum for each concentration entry from <code>labels.csv</code>. The input file may correspond to single-, double-, or triple-species configurations.</figcaption>
  </figure>
</div>

### 2.2 Simulating the absorption spectra

The generated `labels.csv` files were used as input to the `atmospheric_spectra_simulator` script, which utilizes the HITRAN Application Programming Interface (HAPI) to simulate absorption spectra for each concentration specified in the `labels.csv` file [8]. HAPI retrieves the necessary spectral line data from the HITRAN database and reconstructs the absorption spectrum for each gas based on the specified environmental conditions: the gas concentration input, temperature of 273 K, pressure of 1 atm, and a path length of 0.013 cm. The path length was chosen to balance detectability and prevent signal saturation across the selected concentration range. The absorption spectra was calculated over the spectral range of 2000–3200 cm⁻¹, with a resolution of 1 cm⁻¹. Spectral line broadening due to the diluent (air) was also accounted for by using the Voigt profile.

The `atmospheric_spectra_simulator` script generates a `spectra.csv` file, where each column corresponds to a wavelength and each row contains the absorption spectrum associated with a concentration entry from the input `labels.csv`. Parallel processing was employed using `n_workers = 16` which enables the script to iterate through each row in the CSV file more efficiently. This transformation is illustrated in Figure 2. Afterwards, noise corresponding to a percentage of the max value is added to the spectrum.

Spectra for the double- and triple-species configurations were generated by the row-wise addition of the simulated single-species spectra. This method assumes linear and additive absorbance which is typically valid at low concentrations. Noise was added after specral mixing.

For the datasets used in the evaluation, N₂O was used as the sole absorbing gas in the single-species configuration, with air as the diluent. The double-species mixture included both N₂O and CH₄, while the triple-species mixture comprised N₂O, CH₄, and CO.

### 2.3 Training and prediction using PLSR model

Both the `labels.csv` containing the concentration labels, and the `spectra.csv` with the simulated spectral measurements file were loaded to the `PLS-Regression` script to train a model that will be used to predict the gas concentrations.

The data processing pipeline is as follows: spectral data was preprocessed using `StandardScaler`. The data set with 4,000 samples was split into training and test sets with a 0.9:0.1 ratio. Hyperparameter tuning for the PLSR model was also conducted on the training set to identify the optimal number of components based on the calculated coefficient of determination (R²) and root-mean-squared error (RMSE), using 10-fold cross-validation.

The final PLSR model was then re-trained on the entire training set using the optimal number of components, and was evaluated on the withheld training set.

## 3 Results and Discussion

Figure 3 displays the spectral absorption lines of N₂O, CH₄, and CO, within the wavelength range of interest. The plot reveals partial overlap between the absorption features of N₂O and CO, which will be further examined in the triple-species configuration discussed in Section 3.3.

<figure>
  <img src="{{ '/assets/img/projects/prism/fig3-absorption-lines.png' | relative_url }}"
       alt="Absorption lines of N2O, CH4, and CO in the mid-IR">
  <figcaption><strong>Figure 3:</strong> Absorption lines of nitrous oxide (N₂O), methane (CH₄), and carbon monoxide (CO) in the mid-IR.</figcaption>
</figure>

### 3.1 Analysis of PLS model for single-species (N₂O) gas mixture

The simulated absorption spectra for N₂O at a representative concentration of 8.16% mol fraction is shown in Figure 4. Air was used as the diluent in this single-species mixture, which also contributed to the broadening of spectral lines. The plots illustrate the spectra at noise levels of 5%, 10%, and 20%, respectively.

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig4a-single-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of 8.16% N2O at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig4b-single-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of 8.16% N2O at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig4c-single-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of 8.16% N2O at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 4:</strong> Simulated absorption spectra of 8.16% N₂O with air as diluent at various noise levels.</figcaption>
</figure>

The results of hyperparameter tuning across different noise levels are shown in Figure 5. In all cases, selecting `n_components = 1` for yielded the highest average R² and lowest RMSE based on cross-validation of the training set.

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig5a-single-species-tuning.png' | relative_url }}"
           alt="Cross-validated R-squared and RMSE versus number of PLS components at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig5b-single-species-tuning.png' | relative_url }}"
           alt="Cross-validated R-squared and RMSE versus number of PLS components at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig5c-single-species-tuning.png' | relative_url }}"
           alt="Cross-validated R-squared and RMSE versus number of PLS components at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 5:</strong> Hyperparameter tuning reveals the optimal components for the PLS model based on R² and RMSE.</figcaption>
</figure>

After retraining the model using the optimal number of components, its performance was then evaluated on the withheld test set. The predicted concentrations were plotted against the true values and compared to the ideal (red) line which represents perfect prediction.

The results demonstrate strong model performance even in the presence of noise. The model achieved an R² = 0.964 and RMSE = 0.014 (relative RMSE with respect to full range, rRMSE = 4.7%) at a 5% noise level. Meanwhile, the model still performed reasonably well with R² = 0.842 and RMSE = 0.028 (rRMSE = 7.0%) at a higher noise level of 20%. These results highlight the robustness of the PLS model. By analyzing information across a range of wavelengths, the model is able to effectively suppress the influence of noise and maintain high prediction accuracy.

Moreover, limiting the number of components during training ensures that the model captures only the most relevant variance in the data which helps filter out noise. This also reduces the risk of overfitting and improves generalization to unseen samples.

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig6a-single-species-predictions.png' | relative_url }}"
           alt="True versus predicted N2O concentration at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig6b-single-species-predictions.png' | relative_url }}"
           alt="True versus predicted N2O concentration at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig6c-single-species-predictions.png' | relative_url }}"
           alt="True versus predicted N2O concentration at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 6:</strong> Comparison of true and predicted concentrations of N₂O using the trained PLS model, with corresponding R² and RMSE values. The red line represents the line of perfect prediction (R² = 1); all panels use <code>n_components = 1</code>.</figcaption>
</figure>

### 3.2 Analysis of PLS model for double-species (N₂O and CH₄) gas mixture

The double-species gas mixture consisting of N₂O and CH₄ were also analyzed using the same pipeline for the single-species configuration.

Table 1 summarizes the performance metrics of the model after evaluation on the training set at 5%, 10%, and 20% noise levels. Relevant plots for the representative spectra, parameter tuning, and visualization of model prediction are compiled in the Appendix.

<figure class="table-figure">
  <figcaption><strong>Table 1:</strong> Summary of the models' performance for double-gas configuration based on calculated R² and RMSE. The number of components used in PLS training are specified for each noise level.</figcaption>
  <table>
    <thead>
      <tr>
        <th rowspan="2"></th>
        <th colspan="2">5% noise level<br>(<code>n_components = 15</code>)</th>
        <th colspan="2">10% noise level<br>(<code>n_components = 10</code>)</th>
        <th colspan="2">20% noise level<br>(<code>n_components = 10</code>)</th>
      </tr>
      <tr>
        <th>R²</th><th>RMSE</th>
        <th>R²</th><th>RMSE</th>
        <th>R²</th><th>RMSE</th>
      </tr>
    </thead>
    <tbody>
      <tr><th>N₂O</th><td>0.963</td><td>0.014</td><td>0.911</td><td>0.023</td><td>0.712</td><td>0.037</td></tr>
      <tr><th>CH₄</th><td>0.986</td><td>0.008</td><td>0.983</td><td>0.009</td><td>0.988</td><td>0.008</td></tr>
    </tbody>
  </table>
</figure>

The results indicate that the trained model predicted CH₄ concentrations more accurately than N₂O, despite N₂O exhibiting stronger absorption lines as shown in Figure 3. At a noise level of 20%, the model achieved an R² of 0.988 and RMSE of 0.008 for CH₄. Meanwhile, performance dropped for N₂O, with an R² of 0.712 and RMSE of 0.037.

This observation could be attributed to the slightly broader distribution of CH₄ absorption lines throughout the spectrum, which provides more distinct features (wavelengths). Furthermore, the PLS components likely captured more variance related to CH₄ wavelengths.

### 3.3 Analysis of PLS model for triple-species (N₂O, CH₄, and CO) gas mixture

The triple-species mixture of N₂O, CH₄, and CO were also trained and evaluated using a PLS model. Results of the model performance are summarized in Table 2. The relevant plots are included in the Appendix.

<figure class="table-figure">
  <figcaption><strong>Table 2:</strong> Summary of the models' performance for triple-gas configuration based on calculated R² and RMSE. The number of components used in PLS training are specified for each noise level.</figcaption>
  <table>
    <thead>
      <tr>
        <th rowspan="2"></th>
        <th colspan="2">5% noise level<br>(<code>n_components = 15</code>)</th>
        <th colspan="2">10% noise level<br>(<code>n_components = 10</code>)</th>
        <th colspan="2">20% noise level<br>(<code>n_components = 7</code>)</th>
      </tr>
      <tr>
        <th>R²</th><th>RMSE</th>
        <th>R²</th><th>RMSE</th>
        <th>R²</th><th>RMSE</th>
      </tr>
    </thead>
    <tbody>
      <tr><th>N₂O</th><td>0.965</td><td>0.014</td><td>0.910</td><td>0.022</td><td>0.829</td><td>0.030</td></tr>
      <tr><th>CH₄</th><td>0.986</td><td>0.009</td><td>0.969</td><td>0.012</td><td>0.949</td><td>0.016</td></tr>
      <tr><th>CO</th><td>0.854</td><td>0.027</td><td>0.566</td><td>0.048</td><td>0.200</td><td>0.065</td></tr>
    </tbody>
  </table>
</figure>

The results indicate that the model maintained strong performance in predicting CH₄ concentrations, even in the presence of background noise as with the double-species configuration. At 5% noise, the model still achieved reasonable accuracy in predicting CO concentrations. However, increasing the noise level to 10% and 20% significantly affected CO prediction performance, with the R² values dropping to 0.566 and 0.200, respectively.

Nitrous oxide (N₂O) and carbon monoxide (CO) exhibit overlapping absorption features within the spectral range of interest as shown in Figure 3. This overlap may have led to ambiguity in signal attribution, which made it more difficult for the model to predict CO concentrations.

In such cases, additional techniques may be required to better isolate the spectral signatures of CO. For example, feature engineering such as identifying non-overlapping wavelength regions could enhance model performance. Additionally, applying pre-processing methods such as noise smoothing can also improve prediction accuracy.

## 4 Conclusions

This study showed that partial least squares regression (PLSR) can accurately predict gas concentrations from simulated broadband absorption spectra across single-, double-, and triple-species gas mixtures. The model demonstrated good accuracy in predicting CH₄ concentrations across all configurations. This is likely due to methane's broader and more distinct spectral features, which enabled the model to better capture variance during training. In contrast, prediction accuracy for CO declined significantly under higher noise levels, primarily due to spectral overlap with N₂O.

These results highlight the importance of spectral feature distribution in multivariate regression models. To improve performance in such cases, additional techniques like noise smoothing or selective wavelength filtering may be utilized. Overall, the findings support the use of PLSR as a reliable and noise-tolerant method for quantitative gas analysis using spectral measurements.

## References

1. W. Zhang, H. Li, Q. Xiao, and X. Li, Urban rivers are hotspots of riverine greenhouse gas (N₂O, CH₄, CO₂) emissions in the mixed-landscape chaohu lake basin, *Water Res.* **189**, 116624 (2021).
2. S. V. Williams, R. Close, F. B. Piel, B. Barratt, and H. Crabbe, Characterising carbon monoxide household exposure and health impacts in high- and middle-income countries—a rapid literature review, 2010–2024, *Int. J. Environ. Res. Public Health* **22**, 110 (2025).
3. D. E. Williams, Electrochemical sensors for environmental gas analysis, *Curr. Opin. Electrochem.* **22**, 145 (2020).
4. M. Y. Bacaoco, V. P. Juguilon, A. I. Cafe, C. A. Tugado, M. A. B. Faustino, G. Bagtasa, and E. Estacio, Design of a low-cost differential optical absorption spectroscopy set-up for simultaneous monitoring of atmospheric NO₂ concentration and aerosol optical thickness (2020).
5. M. S. I. Sagar, N. R. Allison, H. M. Jalajamony, R. E. Fernandez, and P. K. Sekhar, Review–Modern data analysis in gas sensors, *J. Electrochem. Soc.* **169**, 127512 (2022).
6. H. Abdi and L. J. Williams, Partial least squares methods: partial least squares correlation and partial least square regression, *Methods Mol. Biol.* **930**, 549 (2013).
7. P. L. de Micheaux, B. Liquet, and M. Sutton, A unified parallel algorithm for regularized group PLS scalable to big data, *arXiv* [stat.ML] (2017).
8. R. V. Kochanov, I. E. Gordon, L. S. Rothman, P. Wcisło, C. Hill, and J. S. Wilzewski, HITRAN application programming interface (HAPI): A comprehensive approach to working with spectroscopic data, *J. Quant. Spectrosc. Radiat. Transf.* **177**, 15 (2016).

## Appendix

### Plots for double-species mixture

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig7a-double-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of N2O and CH4 mixture at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig7b-double-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of N2O and CH4 mixture at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig7c-double-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of N2O and CH4 mixture at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 7:</strong> Simulated absorption spectra of 8.16% N₂O and 17.49% CH₄ with air as diluent at various noise levels.</figcaption>
</figure>

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig8a-double-species-tuning.png' | relative_url }}"
           alt="Mean R-squared and RMSE versus number of PLS components for N2O and CH4 at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig8b-double-species-tuning.png' | relative_url }}"
           alt="Mean R-squared and RMSE versus number of PLS components for N2O and CH4 at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig8c-double-species-tuning.png' | relative_url }}"
           alt="Mean R-squared and RMSE versus number of PLS components for N2O and CH4 at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 8:</strong> The optimal number of components is determined based on the mean R² and RMSE for N₂O and CH₄ during 10-fold cross validation.</figcaption>
</figure>

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig9a-double-species-predictions.png' | relative_url }}"
           alt="True versus predicted concentrations of N2O and CH4 at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig9b-double-species-predictions.png' | relative_url }}"
           alt="True versus predicted concentrations of N2O and CH4 at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig9c-double-species-predictions.png' | relative_url }}"
           alt="True versus predicted concentrations of N2O and CH4 at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 9:</strong> Comparison of true and predicted concentrations of N₂O and CH₄ using the trained PLS model.</figcaption>
</figure>

### Plots for triple-species mixture

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig10a-triple-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of N2O, CH4, and CO mixture at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig10b-triple-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of N2O, CH4, and CO mixture at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig10c-triple-species-spectra.png' | relative_url }}"
           alt="Simulated absorption spectrum of N2O, CH4, and CO mixture at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 10:</strong> Simulated absorption spectra of 8.16% N₂O, 17.49% CH₄, and 10.89% CO at various noise levels.</figcaption>
</figure>

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig11a-triple-species-tuning.png' | relative_url }}"
           alt="Mean R-squared and RMSE versus number of PLS components for N2O, CH4, and CO at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig11b-triple-species-tuning.png' | relative_url }}"
           alt="Mean R-squared and RMSE versus number of PLS components for N2O, CH4, and CO at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig11c-triple-species-tuning.png' | relative_url }}"
           alt="Mean R-squared and RMSE versus number of PLS components for N2O, CH4, and CO at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 11:</strong> The optimal number of components is determined based on the mean R² and RMSE for N₂O, CH₄, and CO during 10-fold cross validation.</figcaption>
</figure>

<figure>
  <div class="subfigs">
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig12a-triple-species-predictions.png' | relative_url }}"
           alt="True versus predicted concentrations of N2O, CH4, and CO at 5% noise">
      <figcaption>(a) 5% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig12b-triple-species-predictions.png' | relative_url }}"
           alt="True versus predicted concentrations of N2O, CH4, and CO at 10% noise">
      <figcaption>(b) 10% noise</figcaption>
    </figure>
    <figure class="subfig">
      <img src="{{ '/assets/img/projects/prism/fig12c-triple-species-predictions.png' | relative_url }}"
           alt="True versus predicted concentrations of N2O, CH4, and CO at 20% noise">
      <figcaption>(c) 20% noise</figcaption>
    </figure>
  </div>
  <figcaption><strong>Figure 12:</strong> Comparison of true and predicted concentrations of N₂O, CH₄, and CO using the trained PLS model.</figcaption>
</figure>
