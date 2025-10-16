import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 24 },
  h1: { fontSize: 18, marginBottom: 8 },
  h2: { fontSize: 14, marginVertical: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  card: { border: "1pt solid #ddd", padding: 8, marginBottom: 6 }
});

export function AnalyticsPdf({ activity, conversion, documents, lenders }: {
  activity: any; 
  conversion: any; 
  documents: any; 
  lenders: any;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Monthly Analytics Report</Text>

        <Text style={styles.h2}>Activity</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text>Applications (period)</Text><Text>{activity.apps_this_period || 0}</Text></View>
          <View style={styles.row}><Text>Requires Docs</Text><Text>{activity.requires_docs || 0}</Text></View>
          <View style={styles.row}><Text>In Review</Text><Text>{activity.in_review || 0}</Text></View>
          <View style={styles.row}><Text>Off to Lender</Text><Text>{activity.lenders || 0}</Text></View>
          <View style={styles.row}><Text>Accepted</Text><Text>{activity.sent || 0}</Text></View>
          <View style={styles.row}><Text>Funded (total)</Text><Text>{activity.funded_total || 0}</Text></View>
        </View>

        <Text style={styles.h2}>Conversion (Funnel Totals)</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text>Requires Docs</Text><Text>{conversion.requires_docs || 0}</Text></View>
          <View style={styles.row}><Text>In Review</Text><Text>{conversion.in_review || 0}</Text></View>
          <View style={styles.row}><Text>Off to Lender</Text><Text>{conversion.lenders || 0}</Text></View>
          <View style={styles.row}><Text>Accepted</Text><Text>{conversion.sent || 0}</Text></View>
          <View style={styles.row}><Text>Funded</Text><Text>{conversion.funded || 0}</Text></View>
        </View>

        <Text style={styles.h2}>Documents</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text>Apps with Rejects</Text><Text>{documents.summary?.apps_with_rejects || 0}</Text></View>
          <View style={styles.row}><Text>Apps Missing Docs</Text><Text>{documents.summary?.apps_missing_docs || 0}</Text></View>
          <View style={styles.row}><Text>Apps All Accepted</Text><Text>{documents.summary?.apps_all_accepted || 0}</Text></View>
        </View>

        <Text style={styles.h2}>Top Rejection Categories</Text>
        <View style={styles.card}>
          {(documents.topRejects || []).slice(0, 5).map((item: any, i: number) => (
            <View key={i} style={styles.row}>
              <Text>{item.category || 'Unknown'}</Text>
              <Text>{item.rejects || 0}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Lender Performance</Text>
        <View style={styles.card}>
          {(lenders || []).slice(0, 5).map((lender: any, i: number) => (
            <View key={i} style={styles.row}>
              <Text>{lender.lender_name || 'Unknown'}</Text>
              <Text>Funded: {lender.funded_count || 0}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Generated</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text>Report Date</Text><Text>{new Date().toLocaleDateString()}</Text></View>
          <View style={styles.row}><Text>Time</Text><Text>{new Date().toLocaleTimeString()}</Text></View>
        </View>
      </Page>
    </Document>
  );
}