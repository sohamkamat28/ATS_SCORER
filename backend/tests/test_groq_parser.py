import importlib
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from backend.services import groq_parser


class GroqParserTests(unittest.TestCase):
    def setUp(self):
        self.client = Mock()

    def response(self, value):
        return SimpleNamespace(choices=[SimpleNamespace(
            message=SimpleNamespace(content=value)
        )])

    def test_resume_uses_supported_model_and_json_output(self):
        self.client.chat.completions.create.return_value = self.response(json.dumps({
            'skills': ['Python', 'SQL'],
            'experience': [{'duration_months': '36'}],
        }))
        with patch.object(groq_parser, '_get_client', return_value=self.client):
            result = groq_parser.parse_resume('Synthetic Python resume')
        self.assertEqual(result['skills'], ['Python', 'SQL'])
        self.assertEqual(result['experience'][0]['duration_months'], 36)
        request = self.client.chat.completions.create.call_args.kwargs
        self.assertEqual(request['model'], 'openai/gpt-oss-120b')
        self.assertEqual(request['response_format'], {'type': 'json_object'})
        self.assertEqual(request['max_completion_tokens'], 4096)

    def test_job_description_uses_the_same_parser_contract(self):
        self.client.chat.completions.create.return_value = self.response(
            '{"required_skills": ["Python"], "keywords": ["APIs"]}'
        )
        with patch.object(groq_parser, '_get_client', return_value=self.client):
            result = groq_parser.parse_job_description('Python engineer building APIs')
        self.assertEqual(result['required_skills'], ['Python'])
        self.assertEqual(result['preferred_skills'], [])

    def test_non_object_output_retries_before_validation(self):
        self.client.chat.completions.create.side_effect = [
            self.response('[]'), self.response('{"skills": ["Python"]}')
        ]
        with patch.object(groq_parser, '_get_client', return_value=self.client):
            result = groq_parser.parse_resume('Synthetic resume')
        self.assertEqual(result['skills'], ['Python'])
        self.assertEqual(self.client.chat.completions.create.call_count, 2)

    def test_model_can_be_overridden_without_a_code_change(self):
        try:
            with patch.dict(os.environ, {'GROQ_MODEL': ' configured-model '}):
                self.assertEqual(importlib.reload(groq_parser).GROQ_MODEL, 'configured-model')
        finally:
            importlib.reload(groq_parser)

    def test_empty_model_configuration_uses_the_supported_default(self):
        try:
            with patch.dict(os.environ, {'GROQ_MODEL': ' '}):
                self.assertEqual(importlib.reload(groq_parser).GROQ_MODEL, 'openai/gpt-oss-120b')
        finally:
            importlib.reload(groq_parser)


if __name__ == '__main__':
    unittest.main()
