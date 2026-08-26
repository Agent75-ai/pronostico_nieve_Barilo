package com.barisnow.app;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;

import java.util.List;

/** Configura la ubicación de los widgets sin modificar la ubicación consultada en la app. */
public class WidgetSettingsActivity extends Activity {
    private Spinner zoneSpinner;
    private List<String> zoneKeys;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(4, 14, 25));
        getWindow().setNavigationBarColor(Color.rgb(4, 14, 25));

        int pad = dp(22);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(pad, pad, pad, pad);
        root.setGravity(Gravity.CENTER_HORIZONTAL);
        root.setBackgroundColor(Color.rgb(4, 14, 25));

        TextView title = new TextView(this);
        title.setText("Ubicación del widget");
        title.setTextColor(Color.rgb(234, 247, 255));
        title.setTextSize(26);
        title.setGravity(Gravity.START);
        title.setPadding(0, dp(10), 0, dp(8));
        root.addView(title, matchWrap());

        TextView note = new TextView(this);
        note.setText("Elegí qué barrio querés mantener en los widgets. Esta selección es independiente de la ubicación que consultes dentro de BariSnow.");
        note.setTextColor(Color.rgb(170, 196, 215));
        note.setTextSize(16);
        note.setLineSpacing(0, 1.15f);
        note.setPadding(0, 0, 0, dp(20));
        root.addView(note, matchWrap());

        zoneKeys = BariSnowWidgetProvider.zoneKeys();
        String[] names = new String[zoneKeys.size()];
        for (int i = 0; i < zoneKeys.size(); i++) {
            names[i] = BariSnowWidgetProvider.zoneName(zoneKeys.get(i));
        }

        zoneSpinner = new Spinner(this, Spinner.MODE_DROPDOWN);
        ArrayAdapter<String> adapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_dropdown_item, names) {
            @Override
            public android.view.View getView(int position, android.view.View convertView, ViewGroup parent) {
                android.view.View v = super.getView(position, convertView, parent);
                if (v instanceof TextView) {
                    ((TextView) v).setTextColor(Color.rgb(234, 247, 255));
                    ((TextView) v).setTextSize(17);
                    v.setBackgroundColor(Color.rgb(9, 26, 43));
                    v.setPadding(dp(14), dp(13), dp(14), dp(13));
                }
                return v;
            }
        };
        zoneSpinner.setAdapter(adapter);
        zoneSpinner.setBackgroundColor(Color.rgb(9, 26, 43));
        root.addView(zoneSpinner, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(58)));

        String current = BariSnowWidgetProvider.getWidgetZoneKey(this);
        int selected = Math.max(0, zoneKeys.indexOf(current));
        zoneSpinner.setSelection(selected);

        Button save = new Button(this);
        save.setText("Guardar ubicación del widget");
        save.setTextSize(16);
        save.setAllCaps(false);
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56));
        buttonParams.topMargin = dp(20);
        root.addView(save, buttonParams);

        TextView currentLabel = new TextView(this);
        currentLabel.setText("El widget seguirá mostrando esta zona hasta que la cambies nuevamente.");
        currentLabel.setTextColor(Color.rgb(117, 151, 176));
        currentLabel.setTextSize(14);
        currentLabel.setPadding(0, dp(14), 0, 0);
        root.addView(currentLabel, matchWrap());

        save.setOnClickListener(v -> {
            int position = zoneSpinner.getSelectedItemPosition();
            if (position >= 0 && position < zoneKeys.size()) {
                BariSnowWidgetProvider.setWidgetZone(this, zoneKeys.get(position));
                BariSnowWidgetProvider.requestRefresh(getApplicationContext());
            }
            finish();
        });

        setContentView(root);
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
