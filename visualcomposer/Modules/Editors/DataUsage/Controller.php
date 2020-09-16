<?php

namespace VisualComposer\Modules\Editors\DataUsage;

if (!defined('ABSPATH')) {
    header('Status: 403 Forbidden');
    header('HTTP/1.1 403 Forbidden');
    exit;
}

use VisualComposer\Framework\Illuminate\Support\Module;
use VisualComposer\Framework\Container;
use VisualComposer\Helpers\Options;
use VisualComposer\Helpers\Request;
use VisualComposer\Helpers\Traits\EventsFilters;
use VisualComposer\Helpers\Traits\WpFiltersActions;

/**
 * Class Controller.
 */
class Controller extends Container implements Module
{
    use EventsFilters;
    use WpFiltersActions;

    public function __construct()
    {
        /** @see \VisualComposer\Modules\Editors\DataUsage\Controller::updateInitialUsage */
        $this->addFilter('vcv:editors:frontend:render', 'updateInitialUsage', 1);
        $this->addFilter('vcv:editor:variables', 'addDataCollectionVariables');
        $this->addFilter('vcv:ajax:dataCollection:submit:adminNonce', 'submitDataCollection');
        $this->addFilter('vcv:saveUsageStats', 'saveUsageStats', 10);
        $this->addFilter('vcv:saveTemplateUsage', 'saveTemplateUsage', 10);
        $this->addFilter('vcv:saveTeaserDownload', 'saveTeaserDownload', 10);
    }

    protected function updateInitialUsage()
    {
        global $post;
        if (!isset($post, $post->ID)) {
            return false;
        }
        $optionsHelper = vchelper('Options');

        $sourceId = $post->ID;

        $isAllowed = $optionsHelper->get('settings-itemdatacollection-enabled', false);
        if ($isAllowed) {
            $editorStartDate = date('Y-m-d H:i:s', time());
            update_post_meta($sourceId, '_' . VCV_PREFIX . 'editor-start-at', $editorStartDate);
        }

        $initialUsages = (int)$optionsHelper->get('initial-editor-usage');
        if ($initialUsages) {
            $initialUsages += 1;
        } else {
            $initialUsages = 1;
        }
        $optionsHelper->set('initial-editor-usage', $initialUsages);

        return false;
    }

    /**
     * @param $variables
     * @param $payload
     *
     * @return array
     */
    protected function addDataCollectionVariables($variables, $payload)
    {
        if (isset($payload['sourceId'])) {
            $optionsHelper = vchelper('Options');
            $isEnabled = $optionsHelper->get('settings-itemdatacollection-enabled');
            // Have at least 10 initial usages
            $initialUsages = (int)$optionsHelper->get('initial-editor-usage');
            // @codingStandardsIgnoreLine
            $dataCollectionPopupOk = !$isEnabled && $initialUsages >= 10;

            $variables[] = [
                'key' => 'VCV_SHOW_DATA_COLLECTION_POPUP',
                'value' => $dataCollectionPopupOk,
                'type' => 'constant',
            ];
        }

        return $variables;
    }

    /**
     * Send anonymous usage data collection permit
     *
     * @param $response
     * @param \VisualComposer\Helpers\Request $requestHelper
     * @param \VisualComposer\Helpers\Options $optionsHelper
     *
     * @return array
     */
    protected function submitDataCollection(
        $response,
        Request $requestHelper,
        Options $optionsHelper
    ) {
        $isChecked = (bool)$requestHelper->input('vcv-dataCollection');
        $value = $isChecked ? 'itemDataCollectionEnabled' : '';

        $optionsHelper->set('settings-itemdatacollection-enabled', $value);

        return ['status' => true];
    }

    protected function saveUsageStats($data)
    {
        $sourceId = $data['source-id'];
        $elementCounts = $data['element-counts'];
        $licenseType = $data['license-type'];
        $optionsHelper = vchelper('Options');
        $updatedPostsList = $optionsHelper->get('updated-posts-list');
        if ($updatedPostsList && is_array($updatedPostsList)) {
            if (!in_array($sourceId, $updatedPostsList)) {
                array_push($updatedPostsList, $sourceId);
            }
        } else {
            $updatedPostsList = array($sourceId);
        }
        $optionsHelper->set('updated-posts-list', $updatedPostsList);
        $editorStartDate = get_post_meta($sourceId, '_' . VCV_PREFIX . 'editor-start-at', true);
        $editorEndDate = date('Y-m-d H:i:s', time());
        $editorUsage = get_post_meta($sourceId, '_' . VCV_PREFIX . 'editor-usage', true);
        if ($editorUsage) {
            $editorUsage = unserialize($editorUsage);
        } else {
            $editorUsage = array();
        }

        // Remove previous usage if data was sent before
        $lastSentDate = $optionsHelper->get('last-sent-date');
        foreach ($editorUsage as $key => $value) {
            if ($value['timestamp'] < $lastSentDate) {
                unset($editorUsage[$key]);
            }
        }
        array_push($editorUsage, array(
            'page-id' => $sourceId,
            'license' => $licenseType,
            'start-date' => $editorStartDate,
            'end-date' => $editorEndDate,
            'timestamp' => time(),
        ));

        $editorUsage = serialize($editorUsage);
        $elementCounts = json_decode($elementCounts, true);
        $elementCounts = serialize($elementCounts);
        update_post_meta($sourceId, '_' . VCV_PREFIX . 'editor-usage', $editorUsage);
        // Update editor start time field for multiple save without page refresh
        update_post_meta($sourceId, '_' . VCV_PREFIX . 'editor-start-at', date('Y-m-d H:i:s', time()));
        update_post_meta($sourceId, '_' . VCV_PREFIX . 'element-counts', $elementCounts);

        return false;
    }

    protected function saveTemplateUsage($data)
    {
        $sourceId = $data['source-id'];
        $id = $data['template-id'];
        $templateUniqueId = get_post_meta($id, '_' . VCV_PREFIX . 'id', true);
        $template = $data['template'];
        $optionsHelper = vchelper('Options');
        $licenseType = $optionsHelper->get('license-type');
        $allTemplates = array_values(
            (array)$optionsHelper->get(
                'hubTeaserTemplates',
                []
            )
        );

        $templateData = [];
        foreach ($allTemplates as $value) {
            if ($value['id'] === $templateUniqueId) {
                $templateData = $value;
            }
        }
        if (empty($templateData)) {
            $templateData['templateType'] = 'custom';
        }
        $templateType = $this->getTemplateType($templateData);

        $templateCounts = get_post_meta($sourceId, '_' . VCV_PREFIX . 'template-counts', true);
        $templateCounts = unserialize($templateCounts);
        if (empty($templateCounts)) {
            $templateCounts = [];
        }
        $templateCounts[$id] = [
            'name' => $template['allData']['pageTitle']['current'],
            'license-type' => $licenseType,
            'action' => 'added',
            'date' => date('Y-m-d H:i:s', time()),
            'type' => $templateType,
        ];
        $templateCounts = serialize($templateCounts);
        update_post_meta($sourceId, '_' . VCV_PREFIX . 'template-counts', $templateCounts);


        return false;
    }

    protected function getTemplateType($templateData)
    {
        $type = '';
        $typeKey = $templateData['templateType'];
        switch ($typeKey) {
            case $typeKey === 'hubHeader':
                $type = 'Header';
                break;
            case $typeKey === 'hubFooter':
                $type = 'Footer';
                break;
            case $typeKey === 'hubBlock':
                $type = 'Block';
                break;
            case $typeKey === 'hubSidebar':
                $type = 'Sidebar';
                break;
            case $typeKey === 'custom':
                $type = 'Custom Template';
                break;
            case $typeKey === 'hub':
                if (in_array('free', $templateData['bundleType'])) {
                    $type = 'Free Template';
                } else {
                    $type = 'Premium Template';
                }
                break;
        }

        return $type;
    }

    protected function saveTeaserDownload($data)
    {
        $sourceId = $data['source-id'];
        $teaser = isset($data['template']) ? $data['template'] : $data['element'];
        $optionsHelper = vchelper('Options');
        $licenseType = $optionsHelper->get('license-type');
        $downloadedContent = $optionsHelper->get('downloaded-content', []);
        if (!empty($downloadedContent)) {
            $downloadedContent = unserialize($downloadedContent);
        }

        $teaserId = isset($teaser['id']) ? $teaser['id'] : $teaser['key'];

        if (isset($data['template'])) {
            $downloadedContent['template-usage'][$teaserId] = [
                'page-id' => $sourceId,
                'name' => $teaser['name'],
                'license' => $licenseType,
                'action' => 'downloaded',
                'date' => date('Y-m-d H:i:s', time()),
                'type' => $teaser['type'],
            ];
        } else {
            $downloadedContent['element-usage'][$teaserId] = [
                'page-id' => $sourceId,
                'name' => $teaser['name'],
                'license' => $licenseType,
                'action' => 'downloaded',
                'date' => date('Y-m-d H:i:s', time()),
                'type' => $teaser['type'],
            ];
        }

        $downloadedContent = serialize($downloadedContent);
        $optionsHelper->set('downloaded-content', $downloadedContent);

        return false;
    }
}