package com.barisnow.app;

import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;

import java.util.Arrays;
import java.util.List;

/** Configura la ubicación de los widgets sin modificar la ubicación consultada en la app. */
public class WidgetSettingsActivity extends Activity {
    private static final List<String> KEYS = Arrays.asList(
            "bustillo_95", "lago_moreno", "melipal", "centro", "las_victorias",
            "dina_huapi", "cerro_catedral", "llao_llao", "el_alto"
    );
    private static final List<String> NAMES = Arrays.asList(
            "Bustillo km 9,5 / Centro Atómico", "Barrio Lago Moreno", "Barrio Melipal",
            "Barrio Centro", "Las Victorias", "Dina Huapi", "Cerro Catedral",
            "Llao Llao", "El Alto / Frutillar / 2 de Abril"
    );

    private Spinner zoneSpinner;

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
        title.setPadding(0, dp(10), 0, dp(8));
        root.addView(title, matchWrap());

        TextView note = new TextView(this);
        note.setText("Elegí qué barrio querés mantener en los widgets. Esta selección es independiente de la ubicación que consultes dentro de BariSnow.");
        note.setTextColor(Color.rgb(170, 196, 215));
        note.setTextSize(16);
        note.setLineSpacing(0, 1.15f);
        note.setPadding(0, 0, 0, dp(20));
        root.addView(note, matchWrap());

        zoneSpinner = new Spinner(this, Spinner.MODE_DROPDOWN);
        ArrayAdapter<String> adapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_dropdown_item, NAMES) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                return style(super.getView(position, convertView, parent), false);
            }

            @Override
            public View getDropDownView(int position, View convertView, ViewGroup parent) {
                return style(super.getDropDownView(position, convertView, parent), true);
            }

            private View style(View view, boolean dropdown) {
                if (view instanceof TextView) {
                    TextView text = (TextView) view;
                    text.setTextColor(Color.rgb(234, 247, 255));
                    text.setTextSize(16);
                    text.setPadding(dp(14), dp(12), dp(14), dp(12));
                    text.setBackgroundColor(dropdown ? Color.rgb(12, 34, 52) : Color.rgb(9, 26, 43));
                }
                return view;
            }
        };
        zoneSpinner.setAdapter(adapter);
        zoneSpinner.setBackgroundColor(Color.rgb(9, 26, 43));
        root.addView(zoneSpinner, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(60)));

        SharedPreferences prefs = getSharedPreferences(BariSnowWidgetProvider.PREFS, MODE_PRIVATE);
        String current = prefs.getString(BariSnowWidgetProvider.PREF_ZONE_KEY, "lago_moreno");
        int selected = KEYS.indexOf(current);
        zoneSpinner.setSelection(selected >= 0 ? selected : 1);

        Button save = new Button(this);
        save.setText("Guardar ubicación del widget");
        save.setTextSize(16);
        save.setAllCaps(false);
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56));
        buttonParams.topMargin = dp(20);
        root.addView(save, buttonParams);

        TextView footer = new TextView(this);
        footer.setText("El widget conservará esta zona hasta que la cambies nuevamente. La app puede quedar consultando otro barrio.");
        footer.setTextColor(Color.rgb(117, 151, 176));
        footer.setTextSize(14);
        footer.setPadding(0, dp(14), 0, 0);
        root.addView(footer, matchWrap());

        save.setOnClickListener(v -> {
            int position = zoneSpinner.getSelectedItemPosition();
            if (position >= 0 && position < KEYS.size()) {
                getSharedPreferences(BariSnowWidgetProvider.PREFS, MODE_PRIVATE)
                        .edit()
                        .putString(BariSnowWidgetProvider.PREF_ZONE_KEY, KEYS.get(position))
                        .putString(BariSnowWidgetProvider.PREF_ZONE_NAME, NAMES.get(position))
                        .apply();
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
