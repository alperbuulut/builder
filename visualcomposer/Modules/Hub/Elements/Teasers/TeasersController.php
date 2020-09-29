<?php

namespace VisualComposer\Modules\Hub\Elements\Teasers;

if (!defined('ABSPATH')) {
    header('Status: 403 Forbidden');
    header('HTTP/1.1 403 Forbidden');
    exit;
}

use VisualComposer\Framework\Container;
use VisualComposer\Framework\Illuminate\Support\Module;
use VisualComposer\Helpers\Data;
use VisualComposer\Helpers\Options;
use VisualComposer\Helpers\Request;
use VisualComposer\Helpers\Traits\EventsFilters;

/**
 * Class TeasersController
 * @package VisualComposer\Modules\Hub\Elements\Teasers
 */
class TeasersController extends Container implements Module
{
    use EventsFilters;

    /**
     * TeasersController constructor.
     */
    public function __construct()
    {
        /** @see \VisualComposer\Modules\Hub\Elements\Teasers\TeasersController::ajaxSetTeaserBadge */
        $this->addFilter('vcv:ajax:vcv:hub:teaser:visit:adminNonce', 'ajaxSetTeaserBadge');
        $this->addFilter('vcv:ajax:hub:elements:teasers:updateStatus:adminNonce', 'ajaxSetElementTeaserStatus');

        /** @see \VisualComposer\Modules\Hub\Elements\Teasers\TeasersController::addVariables */
        $this->addFilter(
            'vcv:editor:variables',
            'addVariables'
        );

        $this->addFilter(
            'vcv:hub:variables',
            'addVariables'
        );
    }

    /**
     * @param \VisualComposer\Helpers\Options $optionsHelper
     *
     * @return bool
     */
    protected function ajaxSetTeaserBadge(Options $optionsHelper)
    {
        $optionsHelper->setUser('hubTeaserVisit', $optionsHelper->get('hubAction:hubTeaser'));

        return true;
    }

    /**
     * @param \VisualComposer\Helpers\Request $requestHelper
     * @param \VisualComposer\Helpers\Options $optionsHelper
     * @param \VisualComposer\Helpers\Data $dataHelper
     *
     * @return bool
     */
    protected function ajaxSetElementTeaserStatus(
        $response,
        $payload,
        Request $requestHelper,
        Options $optionsHelper,
        Data $dataHelper
    ) {
        $tag = $requestHelper->input('vcv-item-tag');
        $teaserElements = $optionsHelper->get('hubTeaserElements', false);
        $newElementKey = $dataHelper->arraySearch(
            $teaserElements['All Elements']['elements'],
            'tag',
            $tag,
            true
        );
        if ($newElementKey) {
            $teaserElements['All Elements']['elements'][ $newElementKey ]['isNew'] = false;
            $optionsHelper->set('hubTeaserElements', $teaserElements);
        }

        return true;
    }

    /**
     * @param $variables
     * @param $payload
     * @param \VisualComposer\Helpers\Options $optionsHelper
     *
     * @return array
     */
    protected function addVariables($variables, $payload, Options $optionsHelper)
    {
        $variables[] = [
            'key' => 'vcvHubTeaserShowBadge',
            'value' => version_compare(
                $optionsHelper->getUser('hubTeaserVisit'),
                $optionsHelper->get('hubAction:hubTeaser', '1.0'),
                '<'
            ),
            'type' => 'variable',
        ];

        $value = array_values(
            (array)$optionsHelper->get(
                'hubTeaserElements',
                [
                    'All Elements' => [
                        'id' => 'AllElements0',
                        'index' => 0,
                        'title' => 'All Elements',
                        'elements' => [],
                    ],
                ]
            )
        );

        $variables[] = [
            'key' => 'VCV_HUB_GET_TEASER',
            'value' => $value,
            'type' => 'constant',

        ];

        return $variables;
    }
}
