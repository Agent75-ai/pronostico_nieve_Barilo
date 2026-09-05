#!/usr/bin/env python3
import csv, io, json, os, re, sys, unicodedata, urllib.request
from datetime import datetime, timezone
from statistics import mean, median

DATASET_ID = 'energia-precios-surtidor---resolucion-3142016'
RESOURCE_ID = '80ac25de-a44a-4445-9215-090cf55cfda5'
PACKAGE_API = f'https://datos.gob.ar/api/3/action/package_show?id={DATASET_ID}'
OUTPUT = os.environ.get('FUEL_OUTPUT', 'viaje-bahia-blanca/fuel-price.json')

def fetch(url, timeout=90):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'ViajeBahiaBlanca/1.0 (+https://github.com/Agent75-ai/pronostico_nieve_Barilo)',
        'Accept': 'application/json,text/csv,text/plain,*/*'
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get_content_type(), r.geturl()

def norm(s):
    s = unicodedata.normalize('NFKD', str(s or ''))
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower().strip()
    return re.sub(r'\s+', ' ', s)

def pick_field(fields, candidates):
    nf = {norm(f): f for f in fields}
    for cand in candidates:
        if norm(cand) in nf:
            return nf[norm(cand)]
    for f in fields:
        n = norm(f)
        if any(norm(c) in n for c in candidates):
            return f
    return None

def parse_price(v):
    s = str(v or '').strip().replace(' ', '')
    if not s: return None
    if ',' in s and '.' in s:
        if s.rfind(',') > s.rfind('.'):
            s = s.replace('.', '').replace(',', '.')
        else:
            s = s.replace(',', '')
    elif ',' in s:
        s = s.replace('.', '').replace(',', '.')
    try:
        x = float(s)
    except ValueError:
        return None
    return x if 300 <= x <= 10000 else None

def main():
    meta_bytes, _, _ = fetch(PACKAGE_API, 30)
    meta = json.loads(meta_bytes.decode('utf-8'))
    if not meta.get('success'):
        raise RuntimeError('CKAN package_show no devolvió success=true')
    resources = meta['result'].get('resources', [])
    resource = next((r for r in resources if str(r.get('id')) == RESOURCE_ID), None)
    if resource is None:
        resource = next((r for r in resources if 'vigentes' in norm(r.get('name')) and str(r.get('format','')).lower() == 'csv'), None)
    if resource is None:
        raise RuntimeError('No encontré el recurso de precios vigentes')
    csv_url = resource.get('url') or resource.get('download_url')
    if not csv_url:
        raise RuntimeError('El recurso no contiene URL de descarga')
    if csv_url.startswith('http://'):
        csv_url = 'https://' + csv_url[len('http://'):]
    raw, _, final_url = fetch(csv_url, 120)
    text = raw.decode('utf-8-sig', errors='replace')
    sample = text[:65536]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    fields = reader.fieldnames or []
    product_f = pick_field(fields, ['producto', 'product'])
    price_f = pick_field(fields, ['precio', 'price'])
    station_f = pick_field(fields, ['idempresa', 'id_estacion', 'idestacion', 'cuit', 'empresa'])
    date_f = pick_field(fields, ['fecha_vigencia', 'fecha', 'vigencia'])
    if not product_f or not price_f:
        raise RuntimeError(f'Columnas inesperadas. Campos: {fields}')
    by_station = {}
    all_prices = []
    latest_date = None
    for row in reader:
        product = norm(row.get(product_f))
        if 'nafta' not in product or 'super' not in product or 'premium' in product:
            continue
        p = parse_price(row.get(price_f))
        if p is None:
            continue
        all_prices.append(p)
        station = str(row.get(station_f) or '').strip() if station_f else ''
        if station:
            by_station.setdefault(station, []).append(p)
        if date_f:
            d = str(row.get(date_f) or '').strip()
            if d and (latest_date is None or d > latest_date):
                latest_date = d
    if not all_prices:
        raise RuntimeError('No encontré observaciones válidas de nafta súper')
    station_prices = [mean(vals) for vals in by_station.values()] if by_station else all_prices
    avg = mean(station_prices)
    med = median(station_prices)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
    result = {
        'product': 'Nafta súper',
        'country': 'Argentina',
        'currency': 'ARS',
        'unit': 'litro',
        'average_ars_liter': round(avg, 2),
        'median_ars_liter': round(med, 2),
        'stations': len(station_prices),
        'observations': len(all_prices),
        'latest_reported_at': latest_date,
        'generated_at': now,
        'method': 'Promedio aritmético nacional por estación; si una estación tiene múltiples filas vigentes, primero se promedian sus registros.',
        'source': 'Secretaría de Energía — Precios en Surtidor',
        'source_dataset': 'Precios en Surtidor - Resolución 314/2016',
        'source_resource_id': RESOURCE_ID,
        'source_url': final_url
    }
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
