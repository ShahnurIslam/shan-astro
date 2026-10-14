export type Snippet = {
  category: string;
  topic: string;
  title: string;
  description?: string;
  language: 'python' | 'bash' | 'sql' | 'yaml' | 'dockerfile' | 'typescript' | 'haskell' | 'scala';
  code: string;
};

// Curated from the local Code Snippets export, the linked Notion Code page,
// and the original snippets page. Keep examples generic and safe to publish.
export const snippets: Snippet[] = [
  { category: 'Python', topic: 'Environment & notebooks', title: 'Create a Python project with uv', description: 'uv creates and manages .venv and uv.lock for the project. Use uv run instead of activating the environment.', language: 'bash', code: `uv init my-project
cd my-project
uv add pandas
uv run python -c "import pandas; print(pandas.__version__)"` },
  { category: 'Python', topic: 'Environment & notebooks', title: 'Use a uv project in Jupyter', description: 'Run Jupyter with the project environment, or register a named kernel when you need to select it from another Jupyter server.', language: 'bash', code: `uv add --dev ipykernel
uv run --with jupyter jupyter lab

# Optional: register this project as a named kernel.
uv run ipython kernel install --user --env VIRTUAL_ENV "$(pwd)/.venv" --name=my-project` },
  { category: 'Python', topic: 'Environment & notebooks', title: 'Sync an existing uv project', description: 'Install the versions from the committed uv.lock file, then run a command in the project environment.', language: 'bash', code: `uv sync --locked
uv run python src/main.py` },
  { category: 'Python', topic: 'Environment & notebooks', title: 'Notebook display defaults', language: 'python', code: `%matplotlib inline
%config InlineBackend.figure_format = 'retina'
import pandas as pd
pd.set_option('display.max_rows', 100)
pd.set_option('display.max_columns', 100)` },
  { category: 'Python', topic: 'Environment & notebooks', title: 'Export a notebook to slides', language: 'bash', code: `jupyter nbconvert "analysis.ipynb" --to slides --no-input` },
  { category: 'Python', topic: 'Environment & notebooks', title: 'Read an environment variable', language: 'python', code: `import os

api_key = os.environ['API_KEY']  # Fails clearly if missing
optional_value = os.getenv('OPTIONAL_VALUE', 'default')` },
  { category: 'Python', topic: 'Environment & notebooks', title: 'Time a block of code', language: 'python', code: `from contextlib import contextmanager
from time import perf_counter

@contextmanager
def timed(label: str):
    start = perf_counter()
    try:
        yield
    finally:
        print(f'{label}: {perf_counter() - start:.3f}s')

with timed('load data'):
    data = load_data()` },
  { category: 'Python', topic: 'Environment & notebooks', title: 'Command-line arguments', language: 'python', code: `import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--start-date', required=True)
parser.add_argument('--days', type=int, default=90)
args = parser.parse_args()
print(args.start_date, args.days)` },
  { category: 'Python', topic: 'Environment & notebooks', title: 'Log to console and file', language: 'python', code: `import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
    handlers=[logging.StreamHandler(), logging.FileHandler('app.log')],
)
logger = logging.getLogger(__name__)
logger.info('Started')` },
  { category: 'Python', topic: 'Data structures', title: 'Walk nested dictionaries and lists', language: 'python', code: `def values_for_key(value, target):
    if isinstance(value, dict):
        for key, child in value.items():
            if key == target:
                yield child
            yield from values_for_key(child, target)
    elif isinstance(value, list):
        for child in value:
            yield from values_for_key(child, target)` },
  { category: 'Python', topic: 'Data structures', title: 'Iterate over adjacent pairs', language: 'python', code: `from itertools import pairwise

for previous, current in pairwise(events):
    print(previous, current)` },
  { category: 'Python', topic: 'Data structures', title: 'Split a list on a separator', language: 'python', code: `def split_on(items, separator):
    groups = [[]]
    for item in items:
        if item == separator:
            groups.append([])
        else:
            groups[-1].append(item)
    return groups` },
  { category: 'pandas', topic: 'Import & inspect', title: 'Read and inspect a CSV', language: 'python', code: `import pandas as pd

df = pd.read_csv('data.csv')
print(df.shape)
print(df.dtypes)
print(df.head())` },
  { category: 'pandas', topic: 'Import & inspect', title: 'Save and read Parquet', description: 'Install pyarrow or fastparquet first. Explicitly omit the index when it is not part of the data.', language: 'python', code: `import pandas as pd

df.to_parquet('data.parquet', index=False)
restored = pd.read_parquet('data.parquet')` },
  { category: 'pandas', topic: 'Dates & time', title: 'Parse day/month/year dates', description: 'Specify the format when you know it; use errors="coerce" when invalid values should become NaT.', language: 'python', code: `import pandas as pd

df['date'] = pd.to_datetime(df['date'], format='%d/%m/%Y', errors='coerce')
invalid_rows = df[df['date'].isna()]` },
  { category: 'pandas', topic: 'Dates & time', title: 'Parse timestamps and convert time zones', description: 'Use utc=True only when the input timestamps are UTC or already include an offset.', language: 'python', code: `df['timestamp'] = pd.to_datetime(
    df['timestamp'], format='%Y-%m-%d %H:%M:%S', utc=True
)
df['london_time'] = df['timestamp'].dt.tz_convert('Europe/London')` },
  { category: 'pandas', topic: 'Dates & time', title: 'Localise naive times versus convert aware times', description: 'Use tz_localize when timestamps describe local clock time; use tz_convert when they already have a timezone.', language: 'python', code: `local_clock = pd.to_datetime(df['london_clock'], format='%Y-%m-%d %H:%M:%S')
df['london_time'] = local_clock.dt.tz_localize(
    'Europe/London', ambiguous='NaT', nonexistent='shift_forward'
)
df['utc_time'] = df['london_time'].dt.tz_convert('UTC')` },
  { category: 'pandas', topic: 'Dates & time', title: 'Group by week', language: 'python', code: `weekly = (
    df.groupby(['category', pd.Grouper(key='date', freq='W-MON')])['value']
      .sum()
      .reset_index()
)` },
  { category: 'pandas', topic: 'Dates & time', title: 'Convert a timestamp to Unix seconds', description: 'Make the timezone explicit so results do not depend on the machine running the code.', language: 'python', code: `from datetime import datetime, timezone

timestamp = datetime.strptime('2026-10-14 09:30:00', '%Y-%m-%d %H:%M:%S')
epoch_seconds = int(timestamp.replace(tzinfo=timezone.utc).timestamp())` },
  { category: 'pandas', topic: 'Transform & summarise', title: 'Conditional column', language: 'python', code: `import numpy as np

df['parity'] = np.where(df['value'] % 2 == 0, 'even', 'odd')` },
  { category: 'pandas', topic: 'Transform & summarise', title: 'Vectorised column calculation', description: 'Use column operations for simple arithmetic; reserve apply for logic that cannot be expressed directly.', language: 'python', code: `df['doubled'] = df['value'] * 2
df['revenue_per_order'] = df['revenue'].div(df['orders'].replace(0, float('nan')))` },
  { category: 'pandas', topic: 'Transform & summarise', title: 'Group and aggregate', language: 'python', code: `summary = (
    df.groupby('category', dropna=False)
      .agg(count=('value', 'size'), mean=('value', 'mean'), total=('value', 'sum'))
      .reset_index()
)` },
  { category: 'pandas', topic: 'Transform & summarise', title: 'Fill every category/date combination', language: 'python', code: `categories = df['category'].dropna().unique()
dates = pd.date_range('2026-01-01', '2026-01-31')
index = pd.MultiIndex.from_product([categories, dates], names=['category', 'date'])
complete = df.set_index(['category', 'date']).reindex(index).reset_index()` },
  { category: 'pandas', topic: 'Transform & summarise', title: 'Create labelled numeric bins', language: 'python', code: `import numpy as np

edges = [0, 10, 20, 30, np.inf]
labels = ['0–9', '10–19', '20–29', '30+']
df['band'] = pd.cut(df['value'], bins=edges, labels=labels, right=False)` },
  { category: 'pandas', topic: 'Transform & summarise', title: 'Inspect and convert dataframe dtypes', description: 'Convert to nullable dtypes first. Downcast a measured column only when its range and precision allow it.', language: 'python', code: `before_mb = df.memory_usage(deep=True).sum() / 2**20
df = df.convert_dtypes()
print(df.dtypes)

column = 'count'
values = df[column].dropna()
assert values.between(0, 32_767).all() and values.eq(values.round()).all()
df[column] = df[column].astype('Int16')

after_mb = df.memory_usage(deep=True).sum() / 2**20
print(f'{before_mb:.1f} MB → {after_mb:.1f} MB')` },
  { category: 'pandas', topic: 'Data quality', title: 'Profile rows, duplicates and missing values', language: 'python', code: `import pandas as pd

def profile_table(name: str, df: pd.DataFrame) -> pd.DataFrame:
    missing = df.isna().sum()
    return pd.DataFrame({
        'table': name,
        'column': missing.index,
        'rows': len(df),
        'duplicate_rows': int(df.duplicated().sum()),
        'missing_rows': missing.to_numpy(),
        'missing_pct': (missing / len(df)).to_numpy() if len(df) else 0,
    })

report = pd.concat([profile_table(name, table) for name, table in tables.items()])` },
  { category: 'pandas', topic: 'Time series features', title: 'Lag and roll within each entity', description: 'Sort first and shift before rolling so the current observation is excluded. Reindex to a complete monthly calendar if every month must be represented.', language: 'python', code: `df = df.sort_values(['company_id', 'month']).copy()
df['mrr_previous_observation'] = df.groupby('company_id')['mrr'].shift(1)
df['mrr_prior_3_observations'] = (
    df.groupby('company_id')['mrr']
      .transform(lambda values: values.shift(1).rolling(3, min_periods=3).mean())
)` },
  { category: 'Machine learning', topic: 'Classification', title: 'Split transactions by time', description: 'Choose time boundaries before training. Keep a validation window for model and threshold choices; use the final period once for evaluation.', language: 'python', code: `transactions = transactions.sort_values('event_time').reset_index(drop=True)
features = ['amount', 'hour', 'currency_pair']
train = transactions[transactions['event_time'] < '2026-07-01']
val = transactions[transactions['event_time'].between('2026-07-01', '2026-09-01', inclusive='left')]
test = transactions[transactions['event_time'] >= '2026-09-01']

assert all(not part.empty and part['label'].nunique() == 2 for part in (train, val, test))` },
  { category: 'Machine learning', topic: 'Classification', title: 'Preprocess mixed features inside a classifier pipeline', description: 'Fit imputers and encoders on the training period only; unknown categories are ignored at scoring time.', language: 'python', code: `from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

numeric = ['amount', 'hour']
categorical = ['currency_pair']
preprocess = ColumnTransformer([
    ('num', Pipeline([('fill', SimpleImputer(strategy='median')),
                      ('scale', StandardScaler())]), numeric),
    ('cat', Pipeline([('fill', SimpleImputer(strategy='most_frequent')),
                      ('encode', OneHotEncoder(handle_unknown='ignore'))]), categorical),
])
model = Pipeline([('preprocess', preprocess),
                  ('classifier', LogisticRegression(class_weight='balanced', max_iter=1000))])
model.fit(train[numeric + categorical], train['label'])` },
  { category: 'Machine learning', topic: 'Fraud review', title: 'Evaluate an imbalanced fraud ranking', description: 'Compare average precision with the positive-class base rate; report both before choosing an alert threshold.', language: 'python', code: `from sklearn.metrics import average_precision_score

val_scores = model.predict_proba(val[features])[:, 1]
base_rate = val['label'].mean()
average_precision = average_precision_score(val['label'], val_scores)
print(f'Base fraud rate: {base_rate:.2%}')
print(f'Average precision: {average_precision:.3f}')` },
  { category: 'Machine learning', topic: 'Fraud review', title: 'Choose a threshold on validation data', description: 'The final test period is evaluated only after the threshold is fixed. For a review queue, consider capacity or costs instead of F1.', language: 'python', code: `import numpy as np
from sklearn.metrics import f1_score, precision_recall_curve

precision, recall, thresholds = precision_recall_curve(val['label'], val_scores)
f1 = 2 * precision[:-1] * recall[:-1] / (precision[:-1] + recall[:-1] + 1e-12)
threshold = thresholds[np.argmax(f1)]

test_scores = model.predict_proba(test[features])[:, 1]
test_predictions = (test_scores >= threshold).astype(int)
print(f'Test F1: {f1_score(test["label"], test_predictions):.3f}')` },
  { category: 'Machine learning', topic: 'Fraud review', title: 'Measure fraud caught in the top review share', description: 'Use this when investigators can review only a fixed share of transactions.', language: 'python', code: `from math import ceil
import numpy as np

def review_at_capacity(y_true, scores, share=0.05):
    y = np.asarray(y_true, dtype=int)
    scores = np.asarray(scores, dtype=float)
    if len(y) != len(scores) or not len(y) or not 0 < share <= 1:
        raise ValueError('Expected equal non-empty arrays and 0 < share <= 1')
    k = min(len(y), max(1, ceil(len(y) * share)))
    caught = int(y[np.argsort(scores)[-k:]].sum())
    positives = int(y.sum())
    precision = caught / k
    recall = caught / positives if positives else float('nan')
    lift = precision / y.mean() if positives else float('nan')
    return {'reviewed': k, 'caught': caught, 'precision': precision,
            'recall': recall, 'lift': lift}` },
  { category: 'Machine learning', topic: 'Operational scoring', title: 'Rank cases by probability and value', description: 'Probability × value is a prioritisation assumption; validate it against intervention costs and capacity.', language: 'python', code: `scored = cases[['case_id', 'value_at_risk']].copy()
scored['risk_probability'] = model.predict_proba(cases[features])[:, 1]
scored['priority_score'] = scored['risk_probability'] * scored['value_at_risk']
review_queue = scored.sort_values('priority_score', ascending=False).head(100)` },
  { category: 'Product analytics', topic: 'Funnels', title: 'Count weekly funnel events', description: 'This counts events, not unique people. Use distinct user IDs and a defined event order for a user conversion funnel.', language: 'python', code: `import numpy as np
import pandas as pd

counts = (
    events.groupby([pd.Grouper(key='occurred_at', freq='W-MON'), 'event_name'])
          .size().unstack(fill_value=0)
)
for event in ('created', 'funded'):
    if event not in counts:
        counts[event] = 0
counts['created_to_funded'] = counts['funded'].div(
    counts['created'].replace(0, np.nan)
)` },
  { category: 'Product analytics', topic: 'Funnels', title: 'Separate segment mix from within-segment conversion', description: 'The midpoint decomposition splits the change in overall conversion into changes in segment shares and changes in segment rates. Each row is one segment in one period.', language: 'python', code: `import pandas as pd

def decompose_conversion(summary, early='before', late='after'):
    periods = {}
    for period in (early, late):
        rows = summary[summary['period'] == period].set_index('segment')
        total = rows['starts'].sum()
        if total <= 0:
            raise ValueError(f'{period}: starts must be positive')
        periods[period] = pd.DataFrame({
            'share': rows['starts'] / total,
            'rate': rows['conversions'].div(rows['starts'].replace(0, float('nan'))).fillna(0),
        })

    a = periods[early].reindex(summary['segment'].unique(), fill_value=0)
    b = periods[late].reindex(a.index, fill_value=0)
    mix = (b['share'] - a['share']) * (a['rate'] + b['rate']) / 2
    within = (b['rate'] - a['rate']) * (a['share'] + b['share']) / 2
    return pd.DataFrame({'mix_effect': mix, 'within_effect': within,
                         'total_effect': mix + within})

effects = decompose_conversion(summary)` },
  { category: 'Charts & maps', topic: 'Matplotlib', title: 'Line chart with labels', language: 'python', code: `import matplotlib.pyplot as plt

fig, ax = plt.subplots(figsize=(9, 5))
ax.plot(df['date'], df['value'])
ax.set(title='Value over time', xlabel='Date', ylabel='Value')
fig.autofmt_xdate()
fig.tight_layout()
plt.show()` },
  { category: 'Charts & maps', topic: 'Matplotlib', title: 'Save a figure', language: 'python', code: `fig, ax = plt.subplots()
ax.plot([1, 2, 3], [4, 5, 6])
fig.savefig('plot.png', dpi=200, bbox_inches='tight')` },
  { category: 'Charts & maps', topic: 'Matplotlib', title: 'Annotated heatmap', language: 'python', code: `import matplotlib.pyplot as plt
import numpy as np

values = np.array([[2, 4], [3, 5]])
fig, ax = plt.subplots()
image = ax.imshow(values, cmap='Blues')
ax.set(xticks=range(2), yticks=range(2), xticklabels=['A', 'B'], yticklabels=['X', 'Y'])
for row in range(values.shape[0]):
    for col in range(values.shape[1]):
        ax.text(col, row, f'{values[row, col]:.0f}', ha='center', va='center')
fig.colorbar(image, ax=ax)
fig.tight_layout()` },
  { category: 'Charts & maps', topic: 'Matplotlib', title: 'Bars and conversion line on twin axes', language: 'python', code: `fig, ax = plt.subplots()
ax.bar(df['date'], df['count'], color='#41A5DD', label='Count')
ax.set_ylabel('Count')
ax2 = ax.twinx()
ax2.plot(df['date'], df['conversion'] * 100, color='#EC9AA3', label='Conversion')
ax2.set_ylabel('Conversion (%)')
fig.autofmt_xdate()
fig.tight_layout()` },
  { category: 'Charts & maps', topic: 'Matplotlib', title: 'Simple Gantt chart', language: 'python', code: `import matplotlib.dates as mdates

tasks['start'] = pd.to_datetime(tasks['start'])
tasks['end'] = pd.to_datetime(tasks['end'])
fig, ax = plt.subplots()
for row, task in tasks.reset_index().iterrows():
    ax.barh(row, (task['end'] - task['start']).days, left=task['start'])
ax.set_yticks(range(len(tasks)), tasks['name'])
ax.xaxis.set_major_formatter(mdates.DateFormatter('%d %b'))
fig.autofmt_xdate()` },
  { category: 'Charts & maps', topic: 'Geospatial', title: 'Geodesic midpoint', language: 'python', code: `from math import atan2, cos, degrees, radians, sin, sqrt

def midpoint(lat1, lon1, lat2, lon2):
    a, b, c, d = map(radians, (lat1, lon1, lat2, lon2))
    x1, y1, z1 = cos(a) * cos(b), cos(a) * sin(b), sin(a)
    x2, y2, z2 = cos(c) * cos(d), cos(c) * sin(d), sin(c)
    x, y, z = x1 + x2, y1 + y2, z1 + z2
    return degrees(atan2(z, sqrt(x*x + y*y))), degrees(atan2(y, x))` },
  { category: 'Charts & maps', topic: 'Geospatial', title: 'Route distance with haversine', language: 'python', code: `from math import asin, cos, radians, sin, sqrt

def distance_km(lat1, lon1, lat2, lon2):
    a, b, c, d = map(radians, (lat1, lon1, lat2, lon2))
    h = sin((c-a)/2)**2 + cos(a) * cos(c) * sin((d-b)/2)**2
    return 2 * 6371.0088 * asin(min(1, sqrt(h)))` },
  { category: 'Charts & maps', topic: 'Geospatial', title: 'Plot ordered points with Folium', language: 'python', code: `import folium

points = list(zip(df['latitude'], df['longitude']))
map_view = folium.Map(location=points[0], zoom_start=12)
folium.PolyLine(points, color='blue').add_to(map_view)
for number, point in enumerate(points, start=1):
    folium.Marker(point, tooltip=str(number)).add_to(map_view)
map_view.save('route.html')` },
  { category: 'Charts & maps', topic: 'Geospatial', title: 'Mapbox driving directions', language: 'python', code: `import requests

def directions(start_lonlat, end_lonlat, token):
    coordinates = ';'.join(f'{lon},{lat}' for lon, lat in (start_lonlat, end_lonlat))
    response = requests.get(
        f'https://api.mapbox.com/directions/v5/mapbox/driving/{coordinates}',
        params={'geometries': 'geojson', 'access_token': token}, timeout=20,
    )
    response.raise_for_status()
    return response.json()` },
  { category: 'Experimentation & forecasting', topic: 'Experiments', title: 'Two-proportion z test', language: 'python', code: `from statsmodels.stats.proportion import proportions_ztest

successes = [success_a, success_b]
sample_sizes = [n_a, n_b]
statistic, p_value = proportions_ztest(successes, sample_sizes)` },
  { category: 'Experimentation & forecasting', topic: 'Experiments', title: 'Check sample ratio mismatch', description: 'Compare observed group counts with the planned allocation, for example 60/40.', language: 'python', code: `from scipy.stats import chisquare

observed = [n_control, n_variant]
planned_share = [0.60, 0.40]
assert abs(sum(planned_share) - 1) < 1e-9
expected = [sum(observed) * share for share in planned_share]
statistic, p_value = chisquare(observed, f_exp=expected)` },
  { category: 'Experimentation & forecasting', topic: 'Experiments', title: 'Approximate sample size per group', description: 'Two-sided test of two proportions with equal group sizes.', language: 'python', code: `from math import ceil
from statsmodels.stats.power import NormalIndPower
from statsmodels.stats.proportion import proportion_effectsize

baseline, target = 0.14, 0.175
effect = proportion_effectsize(baseline, target)
n_per_group = ceil(NormalIndPower().solve_power(effect_size=effect, alpha=0.05, power=0.8))` },
  { category: 'Experimentation & forecasting', topic: 'Forecasting', title: 'Forecast error metrics', description: 'MAPE excludes zero actuals; MAE and RMSE work with zero values.', language: 'python', code: `import numpy as np

actual = np.asarray(actual, dtype=float)
forecast = np.asarray(forecast, dtype=float)
error = forecast - actual
mae = np.mean(np.abs(error))
rmse = np.sqrt(np.mean(error**2))
nonzero = actual != 0
mape = np.mean(np.abs(error[nonzero] / actual[nonzero])) if nonzero.any() else np.nan` },
  { category: 'Experimentation & forecasting', topic: 'Forecasting', title: 'Autoregression with AutoReg', description: 'The old note called this ARIMA, but this example is an autoregressive model.', language: 'python', code: `from statsmodels.tsa.ar_model import AutoReg
from sklearn.metrics import root_mean_squared_error

train, test = series.iloc[:-7], series.iloc[-7:]
model = AutoReg(train, lags=7, old_names=False).fit()
predicted = model.predict(start=len(train), end=len(train) + len(test) - 1)
rmse = root_mean_squared_error(test, predicted)` },
  { category: 'Experimentation & forecasting', topic: 'Forecasting', title: 'XGBoost regressor with a time split', description: 'For forecasting, evaluate on later dates and ensure each feature was known at prediction time.', language: 'python', code: `from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error

train = data[data['date'] < '2026-09-01']
test = data[data['date'] >= '2026-09-01']
assert not train.empty and not test.empty
model = XGBRegressor(n_estimators=100, max_depth=3, random_state=42)
model.fit(train[feature_columns], train['target'])
rmse = mean_squared_error(test['target'], model.predict(test[feature_columns])) ** 0.5` },
  { category: 'Experimentation & forecasting', topic: 'Forecasting', title: 'Walk-forward backtest with label availability', description: 'Train only on labels that were available at each prediction date. Build features from information known by that date as well.', language: 'python', code: `import pandas as pd
from sklearn.base import clone
from sklearn.linear_model import Ridge

predictions = []
for origin in sorted(history['as_of_date'].unique()):
    train = history[
        (history['as_of_date'] < origin) &
        (history['target_available_at'] <= origin)
    ]
    current = history[history['as_of_date'] == origin]
    if len(train) < 24 or current.empty:
        continue
    model = clone(Ridge(alpha=1.0)).fit(train[feature_columns], train['target'])
    result = current[['as_of_date']].copy()
    result['prediction'] = model.predict(current[feature_columns])
    predictions.append(result)

backtest = pd.concat(predictions, ignore_index=True) if predictions else pd.DataFrame()` },
  { category: 'SQL & cloud', topic: 'SQL', title: 'Group events by month (Snowflake/PostgreSQL)', language: 'sql', code: `SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS events
FROM events
GROUP BY 1
ORDER BY 1 DESC;` },
  { category: 'SQL & cloud', topic: 'DuckDB', title: 'Unpivot weekly columns into rows', description: 'Turn a wide extract into a long table before joining and charting. Replace the listed week columns with your actual column names.', language: 'sql', code: `UNPIVOT weekly_prices
ON "week_2026_01_05", "week_2026_01_12"
INTO
  NAME week
  VALUE price;` },
  { category: 'SQL & cloud', topic: 'SQL', title: 'Latest row per user (window SQL)', language: 'sql', code: `SELECT *
FROM (
  SELECT events.*, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM events
) ranked
WHERE rn = 1;` },
  { category: 'SQL & cloud', topic: 'SQL', title: 'Previous value with LAG (window SQL)', language: 'sql', code: `SELECT id, ts, value,
       LAG(value) OVER (PARTITION BY id ORDER BY ts) AS previous_value
FROM metrics;` },
  { category: 'SQL & cloud', topic: 'SQL', title: 'Snowflake parameterised IN query', description: 'Use bound parameters instead of interpolating IDs into SQL.', language: 'python', code: `from sqlalchemy import bindparam, text

statement = text("SELECT id FROM listings WHERE id IN :ids").bindparams(
    bindparam('ids', expanding=True)
)
rows = connection.execute(statement, {'ids': listing_ids}).fetchall()` },
  { category: 'SQL & cloud', topic: 'SQL', title: 'Snowflake connection from environment', language: 'python', code: `import os
from sqlalchemy import create_engine
from snowflake.sqlalchemy import URL

engine = create_engine(URL(
    account=os.environ['SNOWFLAKE_ACCOUNT'],
    user=os.environ['SNOWFLAKE_USER'],
    password=os.environ['SNOWFLAKE_PASSWORD'],
    database=os.environ['SNOWFLAKE_DATABASE'],
    schema=os.environ['SNOWFLAKE_SCHEMA'],
))` },
  { category: 'SQL & cloud', topic: 'BigQuery', title: 'Read a BigQuery result into pandas', language: 'python', code: `from google.cloud import bigquery

client = bigquery.Client()
query = "SELECT event_date, COUNT(*) AS events FROM \`project.dataset.events\` GROUP BY 1"
df = client.query(query).result().to_dataframe()` },
  { category: 'SQL & cloud', topic: 'BigQuery', title: 'Train a BigQuery ML model', language: 'sql', code: `CREATE OR REPLACE MODEL \`project.dataset.regression_model\`
OPTIONS(model_type = 'BOOSTED_TREE_REGRESSOR', input_label_cols = ['target']) AS
SELECT target, feature_a, feature_b
FROM \`project.dataset.training_data\`;` },
  { category: 'SQL & cloud', topic: 'BigQuery', title: 'Forecast a time series in BigQuery ML', language: 'sql', code: `CREATE OR REPLACE MODEL \`project.dataset.forecast_model\`
OPTIONS(model_type = 'ARIMA_PLUS', time_series_timestamp_col = 'date',
        time_series_data_col = 'volume', time_series_id_col = 'category') AS
SELECT date, category, volume
FROM \`project.dataset.daily_volume\`;` },
  { category: 'SQL & cloud', topic: 'CloudWatch', title: 'Parse CloudWatch query rows', language: 'python', code: `def parse_log_row(fields):
    return {
        ('timestamp' if item['field'] == '@timestamp' else item['field']): item['value']
        for item in fields if item['field'] not in {'@ptr', '@message'}
    }` },
  { category: 'SQL & cloud', topic: 'CloudWatch', title: 'Run a CloudWatch Logs Insights query', description: 'Bound the polling time and handle every terminal status.', language: 'python', code: `import time

def query_logs(client, group, query, start_epoch, end_epoch, max_wait=120):
    query_id = client.start_query(
        logGroupName=group, queryString=query,
        startTime=start_epoch, endTime=end_epoch,
    )['queryId']
    deadline = time.monotonic() + max_wait
    while time.monotonic() < deadline:
        result = client.get_query_results(queryId=query_id)
        status = result['status']
        if status == 'Complete':
            return result['results']
        if status not in {'Scheduled', 'Running'}:
            raise RuntimeError(f'CloudWatch query {status}')
        time.sleep(1)
    raise TimeoutError(f'CloudWatch query exceeded {max_wait}s')` },
  { category: 'SQL & cloud', topic: 'GCP CLI', title: 'Copy a file to a VM and connect', language: 'bash', code: `gcloud compute scp ./localfile VM_NAME:~/ --zone=ZONE
gcloud compute ssh VM_NAME --zone=ZONE --project=PROJECT_ID` },
  { category: 'SQL & cloud', topic: 'GCP CLI', title: 'Submit a Dataproc PySpark job', language: 'bash', code: `gcloud dataproc jobs submit pyspark job.py \\
  --cluster=CLUSTER_NAME --region=REGION \\
  -- gs://BUCKET/input gs://BUCKET/output` },
  { category: 'Containers & tools', topic: 'Docker', title: 'Python uv project Dockerfile', description: 'Commit uv.lock and exclude .venv from the build context with .dockerignore.', language: 'dockerfile', code: `FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.13.1 /uv /uvx /bin/
WORKDIR /app
COPY pyproject.toml uv.lock ./
COPY . .
RUN uv sync --locked --no-dev
CMD ["uv", "run", "--no-sync", "python", "src/main.py"]` },
  { category: 'Containers & tools', topic: 'Docker', title: 'Compose a web service', language: 'yaml', code: `services:
  web:
    build: .
    ports:
      - "8000:8000"` },
  { category: 'Containers & tools', topic: 'Shell & Git', title: 'Show remote branches with last author', language: 'bash', code: `for branch in $(git branch -r | sed '/HEAD/d'); do
  git log -1 --format='%ai %an' "$branch" | sed "s|$| $branch|"
done | sort -r` },
  { category: 'Containers & tools', topic: 'Shell & Git', title: 'List Kubernetes deployments', language: 'bash', code: `kubectl get deployments --all-namespaces` },
  { category: 'Containers & tools', topic: 'Shell & Git', title: 'Read Avro into pandas', language: 'python', code: `import pandavro

df = pandavro.read_avro('data.avro')
print(df.head())` },
  { category: 'Other languages', topic: 'TypeScript', title: 'Await a promise', language: 'typescript', code: `const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function run() {
  await delay(2000);
  console.log('resolved');
}` },
  { category: 'Other languages', topic: 'Haskell', title: 'Function and pattern matching', language: 'haskell', code: `add :: Int -> Int -> Int
add x y = x + y

factorial :: Int -> Int
factorial 0 = 1
factorial n = n * factorial (n - 1)` },
  { category: 'Other languages', topic: 'Scala', title: 'Case class and collection operations', language: 'scala', code: `case class User(id: Int, name: String)

val numbers = List(1, 2, 3, 4, 5)
val doubledEvens = numbers.filter(_ % 2 == 0).map(_ * 2)` },
];

export const dateFormats = [
  ['%Y', 'Four-digit year', '2026'], ['%y', 'Two-digit year', '26'],
  ['%m', 'Month as a number', '10'], ['%b', 'Abbreviated month name', 'Oct'],
  ['%B', 'Full month name', 'October'], ['%d', 'Day of month', '14'],
  ['%a', 'Abbreviated weekday', 'Wed'], ['%A', 'Full weekday', 'Wednesday'],
  ['%H', 'Hour, 24-hour clock', '09'], ['%I', 'Hour, 12-hour clock', '09'],
  ['%M', 'Minute', '30'], ['%S', 'Second', '45'], ['%f', 'Microseconds', '123456'],
  ['%p', 'AM or PM', 'AM'], ['%z', 'UTC offset', '+0100'], ['%Z', 'Time zone name', 'UTC'],
  ['%j', 'Day of year', '287'], ['%w', 'Weekday number (Sunday = 0)', '3'],
  ['%U', 'Week number (Sunday first)', '41'], ['%W', 'Week number (Monday first)', '41'],
  ['%c', 'Locale date and time', 'Locale dependent'], ['%x', 'Locale date', 'Locale dependent'],
  ['%X', 'Locale time', 'Locale dependent'],
] as const;
