import unittest
import collect
import ontology as O

class CoverageTests(unittest.TestCase):
    def test_every_tracked_company_has_discovery(self):
        self.assertEqual(set(O.HYPERSCALERS), set(O.HYPERSCALER_QUERIES))
        self.assertEqual(len({s['short'] for s in O.SOURCES}), len(O.SOURCES))

    def test_official_infrastructure_does_not_need_company_in_title(self):
        self.assertTrue(collect.relevant_hyperscaler_news('New cloud region opens', '', 'AWS'))

    def test_routine_product_news_rejected(self):
        self.assertFalse(collect.relevant_hyperscaler_news('New iPhone camera colors', '', 'Apple'))

    def test_query_target_is_not_evidence(self):
        self.assertFalse(collect.relevant_hyperscaler_news('Local firm signs data center lease', ''))

    def test_major_news_at_a_conference_survives_noise_filter(self):
        events = collect.build_events([dict(title='Microsoft announces data center investment at conference',
            summary='', url='https://example.com/story', date='2026-09-04', source='TEST', source_tier='trade_press')])
        self.assertEqual(len(events), 1)
        self.assertIn('Microsoft', events[0]['hyperscalers'])

    def test_discovery_is_unconfirmed_and_linked(self):
        events = collect.build_events([dict(title='Google announces new data center',
            summary='', url='https://news.google.com/rss/articles/test', date='2026-09-04',
            source='NEWS-Google', source_tier='unconfirmed', discovery=True, publisher='Example News')])
        self.assertEqual(events[0]['confidence_tier'], 'unconfirmed')
        self.assertEqual(events[0]['publisher'], 'Example News')
        self.assertTrue(events[0]['url'])

    def test_multiple_queries_are_not_corroborating_publishers(self):
        base = dict(title='Google opens a data center', source='NEWS-Google', discovery=True)
        items = [dict(base, url='https://example.com/one'), dict(base, url='https://example.com/two')]
        result = collect.dedupe(items)
        self.assertEqual(len(result), 1)
        self.assertFalse(result[0].get('also_in'))

    def test_failure_and_zero_matches_are_distinct(self):
        rows = collect.hyperscaler_coverage([], [dict(coverage_company='AWS', ok=True, count=0)])
        aws = next(r for r in rows if r['company']=='AWS')
        self.assertEqual(aws['sources_ok'], 1)
        self.assertEqual(aws['items_this_run'], 0)
        self.assertEqual(aws['latest_event'], '')

if __name__ == '__main__':
    unittest.main()
